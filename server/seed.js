import sqlite3 from 'sqlite3';
import crypto from 'crypto';
import fs from 'fs';

const DB_FILE = 'last_race.db';

if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);

const db = new sqlite3.Database(DB_FILE);

// ---------- Static game data: a simplified, fictional Istanbul metro ----------
const stations = [
  { name: 'Taksim',          x: 120, y: 100 },
  { name: 'Mecidiyeköy',     x: 360, y: 100 },
  { name: 'Levent',          x: 620, y: 100 },
  { name: 'Hacıosman',       x: 860, y: 100 },
  { name: 'Gayrettepe',      x: 120, y: 300 },
  { name: 'Yenikapı',        x: 360, y: 300 },
  { name: 'Kirazlı',         x: 620, y: 300 },
  { name: 'Şişhane',         x: 860, y: 300 },
  { name: 'Vezneciler',      x: 120, y: 480 },
  { name: 'Ayrılık Çeşmesi', x: 360, y: 480 },
  { name: 'Mahmutbey',       x: 620, y: 480 },
  { name: 'Kadıköy',         x: 860, y: 480 },
  { name: 'Kartal',          x: 620, y: 640 },
  { name: 'Bostancı',        x: 120, y: 640 },
];

const lines = [
  { name: 'M1', color: '#e6394a' },
  { name: 'M2', color: '#2faa55' },
  { name: 'M3', color: '#2b7de9' },
  { name: 'M4', color: '#e2459c' },
  { name: 'M5', color: '#8a4fbd' },
];

const lineRoutes = {
  1: [1, 2, 6, 7, 8],
  2: [5, 6, 3, 4],
  3: [2, 6, 10, 9],
  4: [14, 5, 10, 11, 12],
  5: [7, 11, 13],
};

const events = [
  { description: 'Smooth ride — the metro glides into the station right on time.', effect: 0 },
  { description: 'You find an Istanbulkart with a little credit still on it.',     effect: 1 },
  { description: 'The smell wins: you grab a warm simit from a platform vendor.',  effect: -1 },
  { description: 'A kind local taps their Istanbulkart to cover your fare.',       effect: 3 },
  { description: 'A pickpocket works the packed carriage near Taksim!',            effect: -3 },
  { description: 'Signal failure on the line; a long, patience-draining delay.',   effect: -2 },
  { description: 'You sprint and catch the connecting train with seconds to spare.', effect: 2 },
  { description: 'Lulled by the ride, you miss your stop and have to double back.', effect: -2 },
  { description: 'The fare inspector waves you through with a friendly smile.',    effect: 2 },
  { description: 'A sudden transit strike forces you into a pricey cross-city taxi.', effect: -4 },
  { description: 'You return a lost wallet to a commuter and earn a warm reward.',  effect: 4 },
  { description: 'A quiet, uneventful glide through the tunnel.',                   effect: 0 },
];

const users = [
  { username: 'alice', name: 'Alice Renzi',   password: 'wadventure' },
  { username: 'bob',   name: 'Bob Conti',     password: 'metropass'  },
  { username: 'carol', name: 'Carol Bianchi', password: 'lastrace'   },
];

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
    status           TEXT NOT NULL,
    score            INTEGER NOT NULL,
    created_at       TEXT NOT NULL,
    FOREIGN KEY (user_id)          REFERENCES users(id),
    FOREIGN KEY (start_station_id) REFERENCES stations(id),
    FOREIGN KEY (dest_station_id)  REFERENCES stations(id)
  )`);

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