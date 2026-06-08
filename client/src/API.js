const SERVER_URL = 'http://localhost:3001/api';

// --- Authentication ---
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

async function getCurrentUser() {
  const response = await fetch(`${SERVER_URL}/sessions/current`, {
    credentials: 'include',
  });
  if (response.ok) {
    return await response.json();
  }
  return null;
}

async function logout() {
  await fetch(`${SERVER_URL}/sessions/current`, {
    method: 'DELETE',
    credentials: 'include',
  });
}

// --- Network ---
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

const API = { login, getCurrentUser, logout, getNetwork, startGame, submitRoute };
export default API;