import {error, json} from '../_lib/http.js';
import {getSession} from '../_lib/auth.js';
import {validGame} from '../_lib/games.js';
import {compactPublicName} from '../_lib/public-name.js';

const normalizeRow = row => ({...row, display_name: compactPublicName(row.display_name), is_me: Boolean(row.is_me)});

export async function onRequestGet({request, env}) {
  const url = new URL(request.url);
  const game = url.searchParams.get('game') || '';
  if (!validGame(game)) return error('Invalid game.', 400, 'INVALID_GAME');
  const limit = Math.max(3, Math.min(8, Number(url.searchParams.get('limit')) || 8));
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
        WHERE game = ? AND solution_used = 0 AND ranking_points > 0
        GROUP BY user_id
      ), ranked AS (
        SELECT t.user_id, u.display_name, u.avatar_url, t.games, t.best, t.ranking_points,
               ROW_NUMBER() OVER (ORDER BY t.ranking_points DESC, t.games DESC, t.best DESC, t.user_id ASC) AS position
        FROM totals t
        JOIN users u ON u.id = t.user_id
      ), mepos AS (
        SELECT position FROM ranked WHERE user_id = ?
      )
      SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END AS is_me
      FROM ranked
      WHERE position <= 3
         OR position BETWEEN MAX(1, COALESCE((SELECT position FROM mepos), 1) - 2)
                         AND COALESCE((SELECT position FROM mepos), 0) + 2
      ORDER BY position ASC
    `).bind(game, userId, userId).all();
    const all = (query.results || []).map(normalizeRow);
    const me = all.find(row => Number(row.user_id) === userId) || null;
    let rows;
    if (me && Number(me.position) === 1) {
      const top = await env.DB.prepare(`
        WITH totals AS (
          SELECT user_id, COUNT(*) AS games, MAX(score) AS best, SUM(ranking_points) AS ranking_points
          FROM results WHERE game = ? AND solution_used = 0 AND ranking_points > 0 GROUP BY user_id
        ), ranked AS (
          SELECT t.user_id, u.display_name, u.avatar_url, t.games, t.best, t.ranking_points,
                 ROW_NUMBER() OVER (ORDER BY t.ranking_points DESC, t.games DESC, t.best DESC, t.user_id ASC) AS position
          FROM totals t JOIN users u ON u.id = t.user_id
        )
        SELECT *, CASE WHEN user_id = ? THEN 1 ELSE 0 END AS is_me FROM ranked WHERE position <= ? ORDER BY position ASC
      `).bind(game, userId, limit).all();
      rows = (top.results || []).map(normalizeRow);
    } else {
      const byPosition = new Map(all.map(row => [Number(row.position), row]));
      const wanted = [1,2,3];
      if (me) {
        const p = Number(me.position);
        wanted.push(p-2,p-1,p,p+1,p+2);
      }
      rows = [...new Set(wanted)].filter(p => p > 0 && byPosition.has(p)).sort((a,b)=>a-b).map(p=>byPosition.get(p)).slice(0,limit);
    }
    return json({rows, me});
  } catch (exception) {
    console.error('Rankings failed', exception);
    return error('Rankings are temporarily unavailable.', 500, 'RANKINGS_FAILED');
  }
}
