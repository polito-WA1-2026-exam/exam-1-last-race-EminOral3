// db.js — Shared SQLite database connection. 
// All DAOs (network-dao, user-dao, game-dao) import this file. 
// This ensures that only ONE connection object is used throughout the application (instead of connection pooling).

import sqlite3 from 'sqlite3';

// Why only one connection?
// Because sqlite3 is a file-based database; opening multiple connections
// can lead to "SQLITE_BUSY" errors. Sharing a single connection is safe and sufficient.

// Single shared connection to the SQLite database file.
const db = new sqlite3.Database('last_race.db', (err) => {
  if (err) throw err;
  
  // activate foreign key constraints for this connection.
  // sqlite3 does not enforce foreign key constraints by default. 
  // Without this line, a game with a non-existent user_id could be added and go unnoticed.
  db.run('PRAGMA foreign_keys = ON');
});

export default db;