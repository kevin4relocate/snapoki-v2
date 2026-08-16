import {requireAdmin} from '../../_lib/admin.js';
import {json,readJson,error} from '../../_lib/http.js';
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

function responseText(data) {
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

function includeUrl(text, url, limit = 6000) {
  let value=String(text||'').trim();
  if (!value.includes(url)) value=`${value}\n\n${url}`.trim();
  return value.slice(0,limit);
}

function xCopy(text, url) {
  const suffix=`\n\n${url}`;
  let value=String(text||'').replaceAll(url,'').trim();
  if (value.length + suffix.length > 280) value=value.slice(0,280-suffix.length).trimEnd();
  return `${value}${suffix}`.slice(0,280);
}

async function generatePack(env, date, variant) {
  const base=buildDailyContent(date,variant);
  if (!env.OPENAI_API_KEY) return {...base,generator:'template'};

  const model=env.OPENAI_MODEL || 'gpt-5.6-luna';
  const prompt=`You write daily social copy for Snapoki, a free browser puzzle website.

Use ONLY the facts below. Do not invent player counts, completion rates, scientific brain claims, scores, records, or puzzle-specific facts that were not supplied. Keep the tone smart, playful and concise, not corporate and not clickbait. Each platform should feel native rather than being the same paragraph copied three times.

Date: ${date}
Game: ${base.game.name}
Category: ${base.game.category}
Content angle: ${base.angle}
Useful game insight: ${base.insight}
Game URL: ${base.url}

Requirements:
- headline: short, specific and suitable for the social image.
- insight: one or two concise sentences explaining the puzzle idea without unsupported claims.
- LinkedIn: about 350-850 characters, short paragraphs, useful hook, one question or challenge, include the exact game URL.
- X: maximum 280 characters including the exact game URL.
- Instagram: concise caption, line breaks, include the exact game URL and finish with 4-7 relevant hashtags including #Snapoki.
- Do not use markdown headings or code fences.
- Do not claim the generated board has properties beyond the supplied game insight.`;

  try {
    const response=await fetch('https://api.openai.com/v1/responses',{
      method:'POST',
      headers:{
        'authorization':`Bearer ${env.OPENAI_API_KEY}`,
        'content-type':'application/json'
      },
      body:JSON.stringify({
        model,
        input:prompt,
        max_output_tokens:1800,
        text:{
          format:{
            type:'json_schema',
            name:'snapoki_social_pack',
            strict:true,
            schema:{
              type:'object',
              additionalProperties:false,
              properties:{
                headline:{type:'string'},
                insight:{type:'string'},
                linkedIn:{type:'string'},
                x:{type:'string'},
                instagram:{type:'string'}
              },
              required:['headline','insight','linkedIn','x','instagram']
            }
          }
        }
      })
    });
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0,500)}`);
    const data=await response.json();
    const text=responseText(data);
    if (!text) throw new Error('OpenAI returned no output text.');
    const ai=JSON.parse(text);
    const headline=String(ai.headline||base.headline).trim().slice(0,120);
    const instagram=includeUrl(ai.instagram,base.url,6000);
    const withTags=instagram.includes('#Snapoki')?instagram:`${instagram}\n\n#Snapoki #puzzle #logicgame #puzzlegame`;
    return {
      ...base,
      headline,
      insight:String(ai.insight||base.insight).trim().slice(0,900),
      linkedIn:includeUrl(ai.linkedIn,base.url,6000),
      x:xCopy(ai.x,base.url),
      instagram:withTags.slice(0,6000),
      image:{...base.image,title:headline},
      generator:'openai',
      model
    };
  } catch (exception) {
    console.error('AI social generation failed; using template fallback.',exception);
    return {...base,generator:'template-fallback'};
  }
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
    current = await writeCurrent(env,await generatePack(env,today,0),{});
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
    const next = await writeCurrent(env,await generatePack(env,today,variant),current?.date === today ? current.posted : {});
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
