const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function fetchJSON(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired');
  }

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// Auth
export const login    = (username, password) => fetchJSON('/auth/login',    { method: 'POST', body: JSON.stringify({ username, password }) });
export const register = (username, password) => fetchJSON('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) });

// Logs
export const fetchLogs     = (page = 1, limit = 50) => fetchJSON(`/logs?page=${page}&limit=${limit}`);
export const fetchStats    = ()                      => fetchJSON('/logs/stats');
export const fetchTimeline = ()                      => fetchJSON('/logs/timeline');
export const ingestLog     = (entry)                 => fetchJSON('/logs/ingest', { method: 'POST', body: JSON.stringify(entry) });

// Alerts
export const fetchAlerts  = (activeOnly = false) => fetchJSON(`/alerts${activeOnly ? '?active=true' : ''}`);
export const resolveAlert = (id)                  => fetchJSON(`/alerts/${id}/resolve`, { method: 'PATCH' });
export const clearResolved = ()                   => fetchJSON('/alerts/resolved', { method: 'DELETE' });

// Tests
export const runVulnTest     = (target_url, tests) => fetchJSON('/tests/run',     { method: 'POST', body: JSON.stringify({ target_url, tests }) });
export const fetchTestResults = ()                  => fetchJSON('/tests/results');

// Extra endpoints
export const fetchTopIps = () => fetchJSON('/logs/top-ips');
export const fetchHealth = () => fetch((import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000') + '/health').then(r => r.json());
