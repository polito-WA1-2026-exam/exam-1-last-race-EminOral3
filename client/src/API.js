// Base URL of the Express server. In the "two servers" pattern the client and
// server live on different origins, so we always use absolute URLs and send the
// session cookie via credentials: 'include'.
const SERVER_URL = 'http://localhost:3001/api';

async function getHello() {
  const response = await fetch(`${SERVER_URL}/hello`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Server response not ok');
  }
  return await response.json();
}

const API = { getHello };
export default API;
