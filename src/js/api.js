export class ApiError extends Error {
  constructor(message, status = 0, code = '') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: {
      ...(options.body ? {'content-type': 'application/json'} : {}),
      ...(options.headers || {})
    }
  });
  const type = response.headers.get('content-type') || '';
  const data = type.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) {
    throw new ApiError(data.error || 'Something went wrong. Please try again.', response.status, data.code || '');
  }
  return data;
}

export function post(path, body = {}) {
  return api(path, {method: 'POST', body: JSON.stringify(body)});
}

export function makeRunId(game) {
  const random = crypto.getRandomValues(new Uint32Array(4));
  return `${game}-${Date.now().toString(36)}-${Array.from(random, n => n.toString(36)).join('')}`;
}
