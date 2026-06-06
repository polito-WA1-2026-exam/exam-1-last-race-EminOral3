import crypto from 'crypto';
import db from '../db.js';

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

// Used by Passport's LocalStrategy. Resolves to the user object on a correct
// password, or to false otherwise. Never leaks hash/salt to the caller.
export function getUser(username, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve(false); // no such user

      crypto.scrypt(password, row.salt, 32, (err2, derivedKey) => {
        if (err2) return reject(err2);
        const storedKey = Buffer.from(row.hash, 'hex');
        // Constant-time comparison; guard against length mismatch first.
        if (storedKey.length !== derivedKey.length ||
            !crypto.timingSafeEqual(storedKey, derivedKey)) {
          return resolve(false); // wrong password
        }
        resolve({ id: row.id, username: row.username, name: row.name });
      });
    });
  });
}

// Used by deserializeUser to rebuild req.user from the id stored in the session.
export async function getUserById(id) {
  return get('SELECT id, username, name FROM users WHERE id = ?', [id]);
}