import db from '../db.js';

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

// Create a new in-progress game. The server is the source of truth for the
// assigned start/destination, so the route submission can be validated later.
export async function createGame(userId, startId, destId) {
  const createdAt = new Date().toISOString();
  return run(
    `INSERT INTO games (user_id, start_station_id, dest_station_id, status, score, created_at)
     VALUES (?, ?, ?, 'in_progress', 0, ?)`,
    [userId, startId, destId, createdAt]
  );
}

export async function getGameById(id) {
  return get('SELECT * FROM games WHERE id = ?', [id]);
}

// Finalise a game with its outcome ('completed' or 'failed') and final score.
export async function finishGame(id, status, score) {
  return run('UPDATE games SET status = ?, score = ? WHERE id = ?', [status, score, id]);
}

// All possible events (used during execution).
export async function getEvents() {
  return all('SELECT id, description, effect FROM events');
}