import {error, json, methodNotAllowed, readJson} from '../_lib/http.js';
import {requireSession} from '../_lib/auth.js';
import {rankingPoints, validDifficulty, validGame, validMode} from '../_lib/games.js';

const clampInt = (value, min, max) => Math.max(min, Math.min(max, Math.round(Number(value) || 0)));

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  const session = await requireSession(request, env);
  if (!session) return error('Sign in to save ranked results.', 401, 'AUTH_REQUIRED');
  const body = await readJson(request);
  if (!body) return error('Invalid JSON body.', 400, 'INVALID_BODY');

  const runId = typeof body.run_id === 'string' ? body.run_id.trim() : '';
  if (runId.length < 12 || runId.length > 180) return error('Invalid run id.', 400, 'INVALID_RUN_ID');
  if (!validGame(body.game)) return error('Invalid game.', 400, 'INVALID_GAME');
  if (!validDifficulty(body.difficulty)) return error('Invalid difficulty.', 400, 'INVALID_DIFFICULTY');
  if (!validMode(body.mode)) return error('Invalid mode.', 400, 'INVALID_MODE');

  const solutionUsed = body.solution_used ? 1 : 0;
  if (solutionUsed) return json({eligible: false, ranking_points: 0, reason: 'practice'});

  const score = clampInt(body.score, 0, 5000);
  const timeMs = clampInt(body.time_ms, 0, 1000 * 60 * 60 * 4);
  const hints = clampInt(body.hints_used, 0, 99);
  const points = rankingPoints({difficulty: body.difficulty, mode: body.mode, score, hints});
  const playedDate = new Date().toISOString().slice(0, 10);
  const metadata = body.metadata && typeof body.metadata === 'object' ? JSON.stringify(body.metadata).slice(0, 8000) : null;

  try {
    const existing = await env.DB.prepare('SELECT id, user_id, score, ranking_points FROM results WHERE run_id = ? LIMIT 1').bind(runId).first();
    if (existing) {
      if (Number(existing.user_id) !== Number(session.user.id)) return error('Run id is already in use.', 409, 'RUN_ID_CONFLICT');
      return json({eligible: true, duplicate: true, id: existing.id, score: existing.score, ranking_points: existing.ranking_points});
    }

    const saved = await env.DB.prepare(`
      INSERT INTO results (run_id, user_id, game, difficulty, mode, score, ranking_points, time_ms, hints_used, solution_used, played_date, metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(runId, session.user.id, body.game, body.difficulty, body.mode, score, points, timeMs, hints, playedDate, metadata).run();

    return json({eligible: true, duplicate: false, id: saved.meta?.last_row_id || null, score, ranking_points: points});
  } catch (exception) {
    console.error('Result save failed', exception);
    return error('Ranked result could not be saved right now.', 500, 'RESULT_SAVE_FAILED');
  }
}
