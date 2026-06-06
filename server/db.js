import sqlite3 from 'sqlite3';

// Single shared connection to the SQLite database file.
const db = new sqlite3.Database('last_race.db', (err) => {
  if (err) throw err;
  db.run('PRAGMA foreign_keys = ON');
});

export default db;