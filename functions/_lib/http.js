export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders
    }
  });
}

export async function readJson(request) {
  try { return await request.json(); }
  catch { return null; }
}

export function error(message, status = 400, code = 'BAD_REQUEST') {
  return json({error: message, code}, status);
}

export function methodNotAllowed() {
  return error('Method not allowed.', 405, 'METHOD_NOT_ALLOWED');
}
