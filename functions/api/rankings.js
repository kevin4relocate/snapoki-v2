import {error, json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game') || '';
  if (!validGame(game)) return error('Invalid game.', 400, 'INVALID_GAME');
  const limit = Math.max(3, Math.min(50, Number(url.searchParams.get('limit')) || 10));
  const session = await getSession(request, env);
  const userId = Number(session?.user?.id || -1);
  try {
    const query = await env.DB.prepare(`
      WITH totals AS (
        SELECT user_id,
               COUNT(*) AS games,
               MAX(score) AS best,
               SUM(ranking_points) AS ranking_points
        FROM results
        WHERE game = ? AND solution_used = 0
        GROUP BY user_id
      ), ranked AS (
        SELECT t.user_id, u.display_name, u.avatar_url, t.games, t.best, t.ranking_points,
               ROW_NUMBER() OVER (ORDER BY t.ranking_points DESC, t.games DESC, t.best DESC, t.user_id ASC) AS position
        FROM totals t
        JOIN users u ON u.id = t.user_id
      )
      SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END AS is_me
      FROM ranked
      WHERE position <= ? OR user_id = ?
      ORDER BY position ASC
    `).bind(game, userId, limit, userId).all();
    const all = query.results || [];
    const rows = all.filter(row => Number(row.position) <= limit).map(row => ({...row, is_me: Boolean(row.is_me)}));
    const meRow = all.find(row => Number(row.user_id) === userId);
    const me = meRow ? {...meRow, is_me: true} : null;
    return json({rows, me});
  } catch (exception) {
    console.error('Rankings failed', exception);
    return error('Rankings are temporarily unavailable.', 500, 'RANKINGS_FAILED');
  }
}
