import {error, json, methodNotAllowed, readJson} from '../../_lib/http.js';
import {requireSession, randomToken} from '../../_lib/auth.js';
import {validDifficulty, validGame, validMode} from '../../_lib/games.js';
import {expectedDailySeed} from '../../_lib/scoring.js';

const ATTEMPT_SECONDS = 60 * 60 * 4;
const ATTEMPTS_PER_MINUTE = 24;

export async function onRequest({request, env}) {
  if (request.method !== 'POST') return methodNotAllowed();
  const origin=request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || (origin && origin !== new URL(request.url).origin)) return error('Cross-site attempt creation is not allowed.', 403, 'CROSS_SITE_BLOCKED');

  const session = await requireSession(request, env);
  if (!session) return error('Sign in to start a ranked attempt.', 401, 'AUTH_REQUIRED');

  const body = await readJson(request);
  if (!body) return error('Invalid JSON body.', 400, 'INVALID_BODY');
  const game = typeof body.game === 'string' ? body.game : '';
  const difficulty = typeof body.difficulty === 'string' ? body.difficulty : '';
  const mode = typeof body.mode === 'string' ? body.mode : '';
  if (!validGame(game)) return error('Invalid game.', 400, 'INVALID_GAME');
  if (!validDifficulty(difficulty)) return error('Invalid difficulty.', 400, 'INVALID_DIFFICULTY');
  if (!validMode(mode)) return error('Invalid mode.', 400, 'INVALID_MODE');

  try {
    const recent=await env.DB.prepare(`SELECT COUNT(*) AS count FROM ranked_attempts WHERE user_id = ? AND datetime(created_at) > datetime('now','-1 minute')`).bind(session.user.id).first();
    if(Number(recent?.count||0)>=ATTEMPTS_PER_MINUTE)return error('Too many new puzzles. Please wait a moment.',429,'ATTEMPT_RATE_LIMIT');
  }catch(exception){console.warn('Attempt rate check failed',exception);}

  const now = new Date();
  const startedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + ATTEMPT_SECONDS * 1000).toISOString();
  const runId = `run_${randomToken()}`;
  let seed = '';

  const cloneRunId = typeof body.clone_run_id === 'string' ? body.clone_run_id.trim() : '';
  if (cloneRunId) {
    const previous = await env.DB.prepare(`
      SELECT seed, game, difficulty, mode
      FROM ranked_attempts
      WHERE run_id = ? AND user_id = ?
      LIMIT 1
    `).bind(cloneRunId, session.user.id).first();
    if (!previous || previous.game !== game || previous.difficulty !== difficulty || previous.mode !== mode) return error('The previous ranked attempt cannot be replayed.', 409, 'ATTEMPT_CLONE_INVALID');
    seed = previous.seed;
  } else if (mode === 'daily') seed = expectedDailySeed(game, difficulty, now);
  else seed = `${game}:${difficulty}:${randomToken()}`;

  try {
    await env.DB.prepare(`DELETE FROM ranked_attempts WHERE datetime(expires_at) <= datetime('now')`).run();
    await env.DB.prepare(`
      INSERT INTO ranked_attempts (run_id, user_id, game, difficulty, mode, seed, started_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(runId, session.user.id, game, difficulty, mode, seed, startedAt, expiresAt).run();
    await env.DB.prepare(`
      DELETE FROM ranked_attempts
      WHERE user_id = ? AND run_id NOT IN (
        SELECT run_id FROM ranked_attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30
      )
    `).bind(session.user.id, session.user.id).run();
    return json({run_id: runId, seed, started_at: startedAt, expires_at: expiresAt, ranked: true});
  } catch (exception) {
    console.error('Ranked attempt creation failed', exception);
    return error('A ranked attempt could not be started right now.', 500, 'ATTEMPT_START_FAILED');
  }
}
