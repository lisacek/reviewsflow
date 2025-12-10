const BASE_URL = import.meta.env.VITE_API_BASE || '';

function normalizeError(status, body, statusText) {
  let code = undefined;
  let message = undefined;
  let requestId = undefined;
  let details = undefined;
  let screenshot = undefined;

  if (body && typeof body === 'object') {
    // Our backend error schema
    if (body.success === false && body.error) {
      code = body.error.code || undefined;
      message = body.error.message || undefined;
      details = body.error.details || undefined;
      screenshot = body.error.screenshot || undefined;
      requestId = body.requestId || undefined;
    }
    // FastAPI default detail
    if (!message && body.detail) {
      message = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      code = code || 'http_' + String(status);
    }
  }

  if (!message) message = `HTTP ${status} ${statusText || ''}`.trim();

  const err = new Error(message);
  err.status = status;
  err.code = code;
  err.requestId = requestId;
  err.details = details;
  err.screenshot = screenshot;
  err.body = body;
  return err;
}

function getToken() {
  try {
    return localStorage.getItem('token') || null;
  } catch {
    return null;
  }
}

async function http(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { headers: userHeaders = {}, body: reqBody } = options;
  const headers = { ...userHeaders };
  if (reqBody !== undefined && headers['Content-Type'] == null) {
    headers['Content-Type'] = 'application/json';
  }
  const token = getToken();
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;
  const resp = await fetch(url, {
    ...options,
    headers,
  });
  const isJson = resp.headers.get('content-type')?.includes('application/json');
  const respBody = isJson ? await resp.json() : await resp.text();
  if (!resp.ok) {
    throw normalizeError(resp.status, respBody, resp.statusText);
  }
  return respBody;
}

export async function getHealth() { return http('/health'); }
export async function getLocales() { return http('/locales'); }

export async function postRefresh(payload) {
  return http('/refresh', { method: 'POST', body: JSON.stringify(payload) });
}

export async function getCache(query = {}) {
  const params = new URLSearchParams();
  if (query.place_url) params.set('place_url', query.place_url);
  if (Array.isArray(query.locales)) query.locales.forEach(l => params.append('locales', l));
  const qs = params.toString();
  return http(`/cache${qs ? `?${qs}` : ''}`);
}

export async function deleteCache(payload) {
  return http('/cache', { method: 'DELETE', body: JSON.stringify(payload) });
}

// Monitors were removed; no longer exported

export const DEFAULT_SORT = 'newest';
export const SORT_OPTIONS = ['newest', 'oldest', 'best', 'worst'];

// Instance-scoped APIs
export async function getInstanceReviews(id) { return http(`/api/reviews/${id}`) }
export async function getInstanceStats(id, opts = {}) {
  const params = new URLSearchParams();
  if (opts.locale) params.set('locale', opts.locale);
  if (opts.exclude_below != null) params.set('exclude_below', String(opts.exclude_below));
  if (opts.max_reviews != null) params.set('max_reviews', String(opts.max_reviews));
  if (opts.force_refresh != null) params.set('force_refresh', String(!!opts.force_refresh));
  const qs = params.toString();
  return http(`/api/stats/${id}${qs ? `?${qs}` : ''}`);
}

// Auth + Admin APIs
export async function register(payload) {
  return http('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export async function login({ username, password }) {
  const params = new URLSearchParams();
  params.set('username', username);
  params.set('password', password);
  return http('/auth/login', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
}

export async function me() { return http('/me'); }

// Domains
export async function getDomains() { return http('/domains'); }
export async function addDomain(host) { return http('/domains', { method: 'POST', body: JSON.stringify({ host }) }); }
export async function deleteDomainById(id) { return http(`/domains/${id}`, { method: 'DELETE' }); }

// Instances
export async function getInstances() { return http('/instances'); }
export async function createInstance(body) { return http('/instances', { method: 'POST', body: JSON.stringify(body) }); }
export async function patchInstance(id, body) { return http(`/instances/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); }
export async function deleteInstanceById(id) { return http(`/instances/${id}`, { method: 'DELETE' }); }

// Public fetch
export async function getPublicReviews(apiBase, publicKey) {
  const base = apiBase || '';
  const url = `${base}/public/reviews/${encodeURIComponent(publicKey)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// Legacy POST /reviews removed

export const fetchReviewsByInstance = (publicKey) =>
    fetch(`${BASE_URL}/public/reviews/${publicKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(async (res) => {
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw normalizeError(res.status, body, res.statusText);
      return body;
    });
