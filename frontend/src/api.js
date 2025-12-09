const BASE_URL = import.meta.env.VITE_API_BASE || '';

const handleResponse = async (res) => {
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.detail || res.statusText);
  }
  return res.json();
};

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
    const err = new Error(`HTTP ${resp.status} ${resp.statusText}`);
    err.status = resp.status;
    err.body = respBody;
    throw err;
  }
  return respBody;
}

export async function getHealth() { return http('/health'); }
export async function getLocales() { return http('/locales'); }

export async function postReviews(payload) {
  return http('/reviews', { method: 'POST', body: JSON.stringify(payload) });
}

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

export async function createMonitor(payload) {
  return http('/monitors', { method: 'POST', body: JSON.stringify(payload) });
}

export async function listMonitors() {
  return http('/monitors');
}

export async function deleteMonitor(id) {
  return http(`/monitors/${id}`, { method: 'DELETE' });
}

export const DEFAULT_SORT = 'newest';
export const SORT_OPTIONS = ['newest', 'oldest', 'best', 'worst'];

export async function getStats(query = {}) {
  const params = new URLSearchParams();
  if (query.place_url) params.set('place_url', query.place_url);
  if (Array.isArray(query.locales)) query.locales.forEach(l => params.append('locales', l));
  if (query.exclude_below != null) params.set('exclude_below', String(query.exclude_below));
  if (query.max_reviews != null) params.set('max_reviews', String(query.max_reviews));
  if (query.force_refresh != null) params.set('force_refresh', String(!!query.force_refresh));
  const qs = params.toString();
  return http(`/stats${qs ? `?${qs}` : ''}`);
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

export const fetchReviewsPublic = (placeUrl, locales, minRating, maxReviews) =>
    fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        place_url: placeUrl,
        locales: locales,
        min_rating: minRating,
        max_reviews: maxReviews,
        sort: 'newest'
      })
    }).then(handleResponse);

export const fetchReviewsByInstance = (publicKey) =>
    fetch(`${BASE_URL}/public/reviews/${publicKey}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    }).then(handleResponse);
