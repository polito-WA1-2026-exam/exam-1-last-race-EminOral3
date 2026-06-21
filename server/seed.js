import sqlite3 from 'sqlite3';
import crypto from 'crypto'; // Node.js's built-in cryptography module for password hashing
import fs from 'fs'; // Node.js's built-in file system module to check for and delete existing database file

const DB_FILE = 'last_race.db'; 

// If the database file already exists, delete it to start fresh 
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

// Two adjacent stop IDs form a "segment" (edge).
// For example, M1 = [1,2,6,7,8] → segments: 1↔2, 2↔6, 6↔7, 7↔8
// This structure allows us to store the line information in a single array.
const lineRoutes = {
  1: [1, 2, 6, 7, 8], // M1: Taksim–Mecidiyeköy–Yenikapı–Kirazlı–Şişhane
  2: [5, 6, 3, 4], // M2: Gayrettepe–Yenikapı–Levent–Hacıosman
  3: [2, 6, 10, 9], // M3: Mecidiyeköy–Yenikapı–Ayrılık Çeşmesi–Vezneciler
  4: [14, 5, 10, 11, 12], // M4: Bostancı–Gayrettepe–Ayrılık Çeşmesi–Mahmutbey–Kadıköy
  5: [7, 11, 13], // M5: Kirazlı–Mahmutbey–Kartal
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

// Passwords are here in plain text — used only during seeding. 
// They are not saved to the database as PLAIN TEXT; they are converted to hash+salt using hashPassword().
const users = [
  { username: 'alice', name: 'Alice Renzi',   password: 'wadventure' },
  { username: 'bob',   name: 'Bob Conti',     password: 'metropass'  },
  { username: 'carol', name: 'Carol Bianchi', password: 'lastrace'   },
];

// Example game logs (project requires at least 2 users to have played).
// Alice (user_id:1) and Bob (user_id:2) have games; Carol does not. 
// 'completed': player submitted a valid route, earned points.
// 'failed': player submitted an invalid/incomplete route → score 0.
// Ranking only takes into account 'completed' and 'failed' games (not in_progress).
const games = [
  { user_id: 1, start: 1, dest: 4,  status: 'completed', score: 18, created_at: '2026-05-10 14:22:00' },
  { user_id: 1, start: 9, dest: 12, status: 'completed', score: 11, created_at: '2026-05-12 09:05:00' },
  { user_id: 1, start: 8, dest: 14, status: 'failed',    score: 0,  created_at: '2026-05-12 09:40:00' },
  { user_id: 2, start: 4, dest: 9,  status: 'completed', score: 23, created_at: '2026-05-11 18:30:00' },
  { user_id: 2, start: 1, dest: 13, status: 'completed', score: 7,  created_at: '2026-05-13 12:15:00' },
];


// ──────────────────────────────────────────────────────────────────────────────────────────
// PASSWORD HASHING
// ───────────────────────────────────────────────────────────────────────────────────────────

// Why hash+salt? To ensure passwords are unreadable even if the database is compromised.
// SALT: A unique 16-byte sequence randomly generated for each user. 
//       Purpose: Even if two users choose the same password, thanks to different salts,
//       their hashes in the database will appear different. This prevents "rainbow table" attacks.
// HASH: scrypt takes the password + salt and, with a deliberately slow computation,
// produces a 32-byte hash. The "deliberate slowness" makes brute-force attacks
// more difficult (bcrypt and argon2 work with the same logic). 
// 
// During login: the password entered by the user + the salt in the DB → scrypt → result
// Compared with the hash in the DB. (see user-dao.js → timingSafeEqual)

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return { salt, hash };
}


// ──────────────────────────────────────────────────────────────────────────────────────────────
// DATABASE CREATION AND ADDING DATA
// ──────────────────────────────────────────────────────────────────────────────────────────

// `db.serialize()` ensures that all commands within it run sequentially. 
// (one before the other finishes, and the next one before the previous one starts).
// Since sqlite3 normally runs asynchronously, without this, an INSERT might be attempted before the tables are created.
db.serialize(() => {

  // TABLES
  // ─────────
  // stations: Each stop on the map. x,y coordinates determine the location in the SVG.
  db.run(`CREATE TABLE stations (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    x    INTEGER NOT NULL,
    y    INTEGER NOT NULL
  )`);
  
  // metro_lines: Each line has only one name and color. 
  // The stations on this line are listed in the line_stations table.
  db.run(`CREATE TABLE metro_lines (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    color TEXT NOT NULL
  )`);

  // line_stations: "Which line goes to which station, in what order?"
  // Why is this separate table needed? Because a station can belong to more than one line (intersection).
  // For example, Yenikapı is on M1, M2, and M3 — this is a many-to-many
  // relationship and is resolved with an intermediate table in relational databases. 
  // position: Line sequence number — required to derive segments. 
  // // FOREIGN KEY: line_id and station_id must point to actual existing records.
  db.run(`CREATE TABLE line_stations (
    line_id    INTEGER NOT NULL,
    station_id INTEGER NOT NULL,
    position   INTEGER NOT NULL,
    PRIMARY KEY (line_id, station_id),
    FOREIGN KEY (line_id)    REFERENCES metro_lines(id),
    FOREIGN KEY (station_id) REFERENCES stations(id)
  )`);

  // events: Random events. One of these is drawn for each segment.
  db.run(`CREATE TABLE events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    effect      INTEGER NOT NULL
  )`);

  // users: Registered players. Passwords are NEVER stored in plain text; hash+salt. 
  // No registration screen — users are only added via seed (as required by spec).
  db.run(`CREATE TABLE users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    name     TEXT NOT NULL,
    hash     TEXT NOT NULL,
    salt     TEXT NOT NULL
  )`);

  // games: Each game session is a record.
  // status: 'in_progress' (playing) | 'completed' (valid route) | 'failed' (invalid)
  // score: Number of coins. 0 for an invalid route. // A game can have multiple records (a player can play many times).
  // Ranking only shows the highest score per user.
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

  // ────────────────────
  // ADDING DATA
  // ────────────────────

  // db.prepare(): "Prepares" (parses) the query once to execute it repeatedly with different values. 
  // This is more efficient and secure than creating a new SQL string in each forEach iteration.
  // Question marks (?): Parametric placeholders — prevent SQL injection attacks. 
  // Values are never directly embedded into the query as strings.
  const st = db.prepare(`INSERT INTO stations (name, x, y) VALUES (?, ?, ?)`);
  stations.forEach((s) => st.run(s.name, s.x, s.y));
  st.finalize(); // Release the prepared statement (memory cleanup)

  const ln = db.prepare(`INSERT INTO metro_lines (name, color) VALUES (?, ?)`);
  lines.forEach((l) => ln.run(l.name, l.color));
  ln.finalize();

  // Flatten lineRoutes and insert into line_stations.
  // Object.entries(): { 1: [...], 2: [...] } → [ ['1', [...]], ['2', [...]] ]
  // Iterate through the stations array for each line; the index (pos) represents the position column.
  const ls = db.prepare(`INSERT INTO line_stations (line_id, station_id, position) VALUES (?, ?, ?)`);
  for (const [lineId, seq] of Object.entries(lineRoutes)) {
    seq.forEach((stationId, pos) => ls.run(Number(lineId), stationId, pos));
  }
  ls.finalize();

  const ev = db.prepare(`INSERT INTO events (description, effect) VALUES (?, ?)`);
  events.forEach((e) => ev.run(e.description, e.effect));
  ev.finalize();

  // When adding users, the password is hashed — plain text isnot entered into the database.
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


// Close the database connection when all operations are complete. 
// db.close() will not run until all commands within db.serialize() are completed —
// sqlite3 automatically manages this sequence.
db.close((err) => {
  if (err) console.error(err);
  else console.log(`Seed complete -> ${DB_FILE}`);
});