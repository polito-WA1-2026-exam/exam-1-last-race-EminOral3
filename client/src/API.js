// All server calls go through this module (separation of concerns).
// credentials:'include' is required on every fetch so the browser sends
// the session cookie to the cross-origin server (:3001).

const SERVER_URL = 'http://localhost:3001/api';

// --- Authentication ---

// POST /api/sessions — returns {id, username, name} or throws on 401.
async function login(username, password) {
  const response = await fetch(`${SERVER_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username, password }),
  });
  if (response.ok) {
    return await response.json();
  }
  const err = await response.json();
  throw new Error(err.error || 'Login failed');
}

// GET /api/sessions/current — called on app load to restore session.
// A 401 response is normal (not logged in); we return null instead of throwing.
async function getCurrentUser() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    credentials: 'include',
  });
  if (response.ok) {
    return await response.json();
  }
  return null;
}

// DELETE /api/sessions/current — clears the server-side session.
async function logout() {
  await fetch(`${SERVER_URL}/sessions/current`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// --- Network ---

// GET /api/network — full map data for the Setup phase (lines + stations).
async function getNetwork() {
  const response = await fetch(`${SERVER_URL}/network`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Failed to load the network');
  }
  return await response.json();
}

// --- Games ---

// POST /api/games — server picks start/dest, returns planning data (no line info).
async function startGame() {
  const response = await fetch(`${SERVER_URL}/games`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({}),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not start a new game');
  }
  return await response.json();
}

// POST /api/games/:id/route — server validates, applies events, returns steps+score.
async function submitRoute(gameId, route) {
  const response = await fetch(`${SERVER_URL}/games/${gameId}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ route }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not submit the route');
  }
  return await response.json();
}


// --- Ranking ---

// GET /api/ranking — best score per user, logged-in only.
async function getRanking() {
  const response = await fetch(`${SERVER_URL}/ranking`, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('Failed to load the ranking');
  }
  return await response.json();
}

const API = { login, getCurrentUser, logout, getNetwork, startGame, submitRoute, getRanking };
export default API;