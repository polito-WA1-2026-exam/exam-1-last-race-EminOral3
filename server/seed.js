import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import fs from 'fs';

const DB_FILE = 'last_race.db';

// Always start from a clean database when (re)seeding.
if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

const db = new sqlite3.Database(DB_FILE);

// ---------- Static game data: the fictional "Old Harbour" underground ----------
// Station ids are assigned 1..14 implicitly, in insertion order.
const stations = [
  { name: 'Aurora Park',      x: 120, y: 100 },
  { name: 'Northgate',        x: 360, y: 100 },
  { name: 'Old Mint',         x: 620, y: 100 },
  { name: 'Belvedere',        x: 860, y: 100 },
  { name: 'Riverside',        x: 120, y: 300 },
  { name: 'Cathedral Square', x: 360, y: 300 },
  { name: 'Market Cross',     x: 620, y: 300 },
  { name: 'Arsenal',          x: 860, y: 300 },
  { name: 'Foundry',          x: 120, y: 480 },
  { name: 'Southbank',        x: 360, y: 480 },
  { name: 'Granary',          x: 620, y: 480 },
  { name: 'Lighthouse',       x: 860, y: 480 },
  { name: 'University',       x: 620, y: 640 },
  { name: 'Hillcrest',        x: 120, y: 640 },
];

const lines = [
  { name: 'Coral Line', color: '#e6394a' },
  { name: 'Azure Line', color: '#2b7de9' },
  { name: 'Fern Line',  color: '#2faa55' },
  { name: 'Amber Line', color: '#f0a821' },
  { name: 'Plum Line',  color: '#8a4fbd' },
];

// line_id -> ordered list of station ids. Adjacent ids form the line's segments.
const lineRoutes = {
  1: [1, 2, 6, 7, 8],     // Coral
  2: [5, 6, 3, 4],        // Azure
  3: [2, 6, 10, 9],       // Fern
  4: [14, 5, 10, 11, 12], // Amber
  5: [7, 11, 13],         // Plum
};

const events = [
  { description: 'Smooth ride, the train glides in right on time.',        effect: 0 },
  { description: 'You spot a coin glinting on the platform and pocket it.', effect: 1 },
  { description: 'A busker plays beautifully; you tip them happily.',       effect: -1 },
  { description: 'A kind commuter hands you a spare day pass.',             effect: 3 },
  { description: 'A pickpocket strikes in the crowded carriage!',          effect: -3 },
  { description: 'Signal failure: a long delay drains your patience.',      effect: -2 },
  { description: 'You stumble into an empty first-class seat by mistake.',  effect: 2 },
  { description: 'You doze off, miss your stop and have to backtrack.',     effect: -2 },
  { description: 'The conductor waives your fare with a wink.',             effect: 2 },
  { description: 'A wildcat strike forces you into a pricey taxi.',         effect: -4 },
  { description: 'You return a lost wallet and earn a generous reward.',    effect: 4 },
  { description: 'A quiet, uneventful stretch of tunnel.',                  effect: 0 },
];

// Passwords are hashed below; the plaintext is only used here at seed time.
const users = [
  { username: 'alice', name: 'Alice Renzi',   password: 'wadventure' },
  { username: 'bob',   name: 'Bob Conti',     password: 'metropass'  },
  { username: 'carol', name: 'Carol Bianchi', password: 'lastrace'   },
];

// Pre-played games: alice (1) and bob (2) have history; carol (3) has none.
const games = [
  { user_id: 1, start: 1, dest: 4,  status: 'completed', score: 18, created_at: '2026-05-10 14:22:00' },
  { user_id: 1, start: 9, dest: 12, status: 'completed', score: 11, created_at: '2026-05-12 09:05:00' },
  { user_id: 1, start: 8, dest: 14, status: 'failed',    score: 0,  created_at: '2026-05-12 09:40:00' },
  { user_id: 2, start: 4, dest: 9,  status: 'completed', score: 23, created_at: '2026-05-11 18:30:00' },
  { user_id: 2, start: 1, dest: 13, status: 'completed', score: 7,  created_at: '2026-05-13 12:15:00' },
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}

db.serialize(() => {
  // --- Schema ---
  db.run(`CREATE TABLE stations (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    x    INTEGER NOT NULL,
    y    INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE metro_lines (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE line_stations (
    line_id    INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    position   INTEGER NOT NULL,
    PRIMARY KEY (line_id, station_id),
    FOREIGN KEY (line_id)    REFERENCES metro_lines(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
  )`);

  db.run(`CREATE TABLE events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    effect      INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name     TEXT NOT NULL,
    hash     TEXT NOT NULL,
    salt     TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE games (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL,
    start_station_id INTEGER NOT NULL,
    dest_station_id  INTEGER NOT NULL,
    status           TEXT NOT NULL,            -- 'completed' or 'failed'
    score            INTEGER NOT NULL,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (user_id)          REFERENCES users(id),
    FOREIGN KEY (start_station_id) REFERENCES stations(id),
    FOREIGN KEY (dest_station_id)  REFERENCES stations(id)
  )`);

  // --- Data ---
  const st = db.prepare(`INSERT INTO stations (name, x, y) VALUES (?, ?, ?)`);
  stations.forEach((s) => st.run(s.name, s.x, s.y));
  st.finalize();

  const ln = db.prepare(`INSERT INTO metro_lines (name, color) VALUES (?, ?)`);
  lines.forEach((l) => ln.run(l.name, l.color));
  ln.finalize();

  const ls = db.prepare(`INSERT INTO line_stations (line_id, station_id, position) VALUES (?, ?, ?)`);
  for (const [lineId, seq] of Object.entries(lineRoutes)) {
    seq.forEach((stationId, pos) => ls.run(Number(lineId), stationId, pos));
  }
  ls.finalize();

  const ev = db.prepare(`INSERT INTO events (description, effect) VALUES (?, ?)`);
  events.forEach((e) => ev.run(e.description, e.effect));
  ev.finalize();

  const us = db.prepare(`INSERT INTO users (username, name, hash, salt) VALUES (?, ?, ?, ?)`);
  users.forEach((u) => {
    const { salt, hash } = hashPassword(u.password);
    us.run(u.username, u.name, hash, salt);
  });
  us.finalize();

  const gm = db.prepare(`INSERT INTO games
    (user_id, start_station_id, dest_station_id, status, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?)`);
  games.forEach((g) => gm.run(g.user_id, g.start, g.dest, g.status, g.score, g.created_at));
  gm.finalize();
});

db.close((err) => {
  if (err) console.error(err);
  else console.log(`Seed complete -> ${DB_FILE}`);
});