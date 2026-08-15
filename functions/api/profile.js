import {error, json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';

function calculateStreak(days = []) {
  const set = new Set(days);
  if (!set.size) return 0;
  const cursor = new Date();
  let day = cursor.toISOString().slice(0,10);
  if (!set.has(day)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    day = cursor.toISOString().slice(0,10);
    if (!set.has(day)) return 0;
  }
  let streak = 0;
  while (set.has(cursor.toISOString().slice(0,10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game') || '';
  if (!validGame(game)) return error('Invalid game.', 400, 'INVALID_GAME');
  const session = await getSession(request, env);
  if (!session) return json({user: null, games: 0, best: 0, ranking_points: 0, streak: 0});
  try {
    const summary = await env.DB.prepare(`
      SELECT COUNT(*) AS games,
             COALESCE(MAX(score),0) AS best,
             COALESCE(SUM(ranking_points),0) AS ranking_points
      FROM results
      WHERE user_id = ? AND game = ? AND solution_used = 0
    `).bind(session.user.id, game).first();
    const dates = await env.DB.prepare(`
      SELECT DISTINCT played_date
      FROM results
      WHERE user_id = ? AND game = ? AND solution_used = 0
      ORDER BY played_date DESC
      LIMIT 120
    `).bind(session.user.id, game).all();
    return json({
      user: session.user,
      games: Number(summary?.games || 0),
      best: Number(summary?.best || 0),
      ranking_points: Number(summary?.ranking_points || 0),
      streak: calculateStreak((dates.results || []).map(row => row.played_date))
    });
  } catch (exception) {
    console.error('Profile failed', exception);
    return error('Profile is temporarily unavailable.', 500, 'PROFILE_FAILED');
  }
}
