// user-dao.js — User database operations (Data Access Object).
// Routes do not deal directly with SQL; they call these functions. 
// This provides "separation of concerns":
// Even if the route changes, the DB logic remains here, only this part is updated.

import crypto from 'crypto';
import db from '../db.js';


// Wrapping sqlite3's callback-based db.get in a Promise.
// This allows the calling code to use async/await (following the DAO pattern in the slides).
// Why aren't we wrapping db.all here? Because this file contains queries returning a single record; 
// for those returning multiple records (e.g., network-dao.js), there is a separate `all` wrapper.
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// LOGIN VERIFICATION (Passport is called by LocalStrategy)
// ─────────────────────────────────────────────────────────────────────────────

// Accepts the username and input password; returns the user object if valid,
// false if invalid, and rejects if an error occurs.
// Note: This function NEVER returns hashes or salts.
// This ensures that even if user data is sent to the client, sensitive data cannot leak.
export function getUser(username, password) {
  return new Promise((resolve, reject) => {
    // First find the user (SELECT * — including hash and salt, but only within this function)
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(false); // if no user with that username exists, return false (invalid login)

      // Hashes the input password with the DB salt and compares it against the stored hash.
      // Why async scrypt over scryptSync?
      // Hashing is purposefully slow to deter brute-force attempts.
      // Using the sync version would block the entire server.
      // The async version executes in the background, leaving the Node event loop unblocked.
      crypto.scrypt(password, row.salt, 32, (err2, derivedKey) => {
        if (err2) return reject(err2);
        const storedKey = Buffer.from(row.hash, 'hex');
        
        
        // Why timingSafeEqual?
        // Standard === comparison short-circuits on the first different byte, creating a "timing attack" flaw:
        // attackers can infer correct hash bytes by measuring response latencies.
        // timingSafeEqual executes in constant time, preventing this vulnerability.
        // Length check first: passing mismatched buffer lengths to timingSafeEqual throws an error.
        // (32-byte scrypt outputs must always match in length; this acts as an extra security layer.)
        if (storedKey.length !== derivedKey.length ||
            !crypto.timingSafeEqual(storedKey, derivedKey)) {
          return resolve(false); // wrong password
        }
        
        // password is correct; return the user object (without hash and salt).
        resolve({ id: row.id, username: row.username, name: row.name });
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION RENEWAL (Called by Passport deserializeUser)
// ─────────────────────────────────────────────────────────────────────────────
 
// In every HTTP request, Passport calls this function with the user.id stored in the session,
// and recreates req.user. Thus, only the ID is stored in the session cookie,
// sensitive data (hash, salt) is not written to the cookie.

// Used by deserializeUser to rebuild req.user from the id stored in the session.
export async function getUserById(id) {
  // Not SELECT *, just secure fields. Hash/salt isn't even queried.
  return get('SELECT id, username, name FROM users WHERE id = ?', [id]);
}