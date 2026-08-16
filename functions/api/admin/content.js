import {requireAdmin} from '../../_lib/admin.js';
import {json,readJson,error,methodNotAllowed} from '../../_lib/http.js';
import {buildDailyContent,contentDate} from '../../_lib/social-content.js';

async function ensureTable(env) {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS admin_social_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content_date TEXT NOT NULL,
    variant INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT NOT NULL,
    posted_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`).run();
}

function parse(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

async function readCurrent(env) {
  const row = await env.DB.prepare(`SELECT content_date,variant,payload_json,posted_json,updated_at FROM admin_social_content WHERE id=1`).first();
  if (!row) return null;
  return {
    date:row.content_date,
    variant:Number(row.variant)||0,
    payload:parse(row.payload_json,null),
    posted:parse(row.posted_json,{}),
    updatedAt:row.updated_at
  };
}

async function writeCurrent(env, pack, posted = {}) {
  await env.DB.prepare(`INSERT INTO admin_social_content(id,content_date,variant,payload_json,posted_json,updated_at)
    VALUES(1,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET content_date=excluded.content_date,variant=excluded.variant,payload_json=excluded.payload_json,posted_json=excluded.posted_json,updated_at=CURRENT_TIMESTAMP`)
    .bind(pack.date,pack.variant,JSON.stringify(pack),JSON.stringify(posted)).run();
  return await readCurrent(env);
}

async function authorize(request, env) {
  const result = await requireAdmin(request, env);
  if (!result.ok) return result.response;
  return null;
}

export async function onRequestGet({request,env}) {
  const denied = await authorize(request,env); if (denied) return denied;
  await ensureTable(env);
  const today = contentDate();
  let current = await readCurrent(env);
  if (!current || current.date !== today) {
    current = await writeCurrent(env,buildDailyContent(today,0),{});
  }
  return json({content:current});
}

export async function onRequestPost({request,env}) {
  const denied = await authorize(request,env); if (denied) return denied;
  await ensureTable(env);
  const body = await readJson(request);
  if (!body || typeof body.action !== 'string') return error('Invalid request.');
  const today = contentDate();
  const current = await readCurrent(env);

  if (body.action === 'regenerate') {
    const variant = current?.date === today ? (current.variant + 1) : 0;
    const next = await writeCurrent(env,buildDailyContent(today,variant),current?.date === today ? current.posted : {});
    return json({content:next});
  }

  if (body.action === 'save') {
    if (!current?.payload || current.date !== today) return error('Generate today’s content first.',409);
    const allowed = ['headline','linkedIn','x','instagram'];
    const payload = {...current.payload};
    for (const key of allowed) if (typeof body[key] === 'string') payload[key] = body[key].slice(0,6000);
    const saved = await writeCurrent(env,payload,current.posted);
    return json({content:saved});
  }

  if (body.action === 'posted') {
    if (!current) return error('No content to update.',404);
    const platform = String(body.platform||'');
    if (!['linkedIn','x','instagram'].includes(platform)) return error('Unknown platform.');
    const posted = {...current.posted,[platform]:Boolean(body.value)};
    const saved = await writeCurrent(env,current.payload,posted);
    return json({content:saved});
  }

  return error('Unknown action.');
}

export async function onRequestDelete({request,env}) {
  const denied = await authorize(request,env); if (denied) return denied;
  await ensureTable(env);
  const url = new URL(request.url);
  if (url.searchParams.get('all') === '1') {
    await env.DB.prepare('DELETE FROM admin_social_content').run();
  } else {
    await env.DB.prepare('DELETE FROM admin_social_content WHERE id=1 AND content_date=?').bind(contentDate()).run();
  }
  return json({ok:true});
}

export async function onRequest(context) {
  return methodNotAllowed();
}
