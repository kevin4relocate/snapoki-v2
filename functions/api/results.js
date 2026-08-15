import {error, json, methodNotAllowed, readJson} from '../_lib/http.js';
import {requireSession} from '../_lib/auth.js';
import {rankingPoints, validDifficulty, validGame, validMode} from '../_lib/games.js';
import {verifyAndScoreResult} from '../_lib/scoring.js';

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  if (request.headers.get('sec-fetch-site') === 'cross-site') return error('Cross-site result submission is not allowed.', 403, 'CROSS_SITE_BLOCKED');

  const session = await requireSession(request, env);
  if (!session) return error('Sign in to save ranked results.', 401, 'AUTH_REQUIRED');
  const body = await readJson(request);
  if (!body) return error('Invalid JSON body.', 400, 'INVALID_BODY');

  const runId = typeof body.run_id === 'string' ? body.run_id.trim() : '';
  if (runId.length < 20 || runId.length > 180) return error('Invalid run id.', 400, 'INVALID_RUN_ID');
  if (!validGame(body.game)) return error('Invalid game.', 400, 'INVALID_GAME');
  if (!validDifficulty(body.difficulty)) return error('Invalid difficulty.', 400, 'INVALID_DIFFICULTY');
  if (!validMode(body.mode)) return error('Invalid mode.', 400, 'INVALID_MODE');
  if (body.solution_used) return json({eligible:false, ranking_points:0, reason:'practice'});

  try {
    const existing = await env.DB.prepare('SELECT id, user_id, score, ranking_points FROM results WHERE run_id = ? LIMIT 1').bind(runId).first();
    if (existing) {
      if (Number(existing.user_id) !== Number(session.user.id)) return error('Run id is already in use.', 409, 'RUN_ID_CONFLICT');
      return json({eligible:true, duplicate:true, id:existing.id, score:existing.score, ranking_points:existing.ranking_points});
    }

    const attempt = await env.DB.prepare(`
      SELECT run_id, user_id, game, difficulty, mode, seed, started_at, expires_at, consumed_at
      FROM ranked_attempts
      WHERE run_id = ? AND user_id = ?
      LIMIT 1
    `).bind(runId, session.user.id).first();
    if (!attempt) return error('This ranked attempt was not issued to this account.', 409, 'ATTEMPT_NOT_FOUND');
    if (attempt.consumed_at) return error('This ranked attempt has already been used.', 409, 'ATTEMPT_CONSUMED');
    if (Date.parse(attempt.expires_at) <= Date.now()) return error('This ranked attempt has expired.', 410, 'ATTEMPT_EXPIRED');
    if (attempt.game !== body.game || attempt.difficulty !== body.difficulty || attempt.mode !== body.mode) return error('Ranked attempt details do not match.', 409, 'ATTEMPT_MISMATCH');
    if (!body.metadata || body.metadata.seed !== attempt.seed) return error('Puzzle seed does not match this ranked attempt.', 409, 'ATTEMPT_SEED_MISMATCH');

    // Ranked time is measured by the server-issued attempt, not trusted from the browser.
    const serverTimeMs = Math.max(1000, Date.now() - Date.parse(attempt.started_at));
    const verified = verifyAndScoreResult({
      game: body.game,
      difficulty: body.difficulty,
      mode: body.mode,
      time_ms: serverTimeMs,
      hints_used: body.hints_used,
      metadata: body.metadata
    });
    if (!verified.ok) return error('This result could not be verified as a valid ranked finish.', 422, verified.reason || 'RESULT_NOT_VERIFIED');

    const score = verified.score;
    const timeMs = verified.timeMs;
    const hints = verified.hints;
    const points = rankingPoints({difficulty:body.difficulty, mode:body.mode, score, hints});
    const playedDate = new Date().toISOString().slice(0,10);
    const metadata = JSON.stringify({...verified.metadata, seed:attempt.seed}).slice(0,8000);
    const consumedAt = new Date().toISOString();

    const insert = env.DB.prepare(`
      INSERT INTO results (run_id, user_id, game, difficulty, mode, score, ranking_points, time_ms, hints_used, solution_used, played_date, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(runId, session.user.id, body.game, body.difficulty, body.mode, score, points, timeMs, hints, playedDate, metadata);
    const consume = env.DB.prepare(`UPDATE ranked_attempts SET consumed_at = ? WHERE run_id = ? AND user_id = ? AND consumed_at IS NULL`).bind(consumedAt, runId, session.user.id);
    const [saved] = await env.DB.batch([insert, consume]);

    return json({eligible:true, duplicate:false, id:saved?.meta?.last_row_id || null, score, ranking_points:points, verified:true, time_ms:timeMs});
  } catch (exception) {
    console.error('Result save failed', exception);
    return error('Ranked result could not be saved right now.', 500, 'RESULT_SAVE_FAILED');
  }
}
