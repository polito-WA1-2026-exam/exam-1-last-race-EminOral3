import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';

import { getNetwork } from './dao/network-dao.js';
import { getUser, getUserById } from './dao/user-dao.js';

const app = express();
const PORT = 3001;

// --- Passport configuration ---
// Verify the username/password pair against the database.
passport.use(new LocalStrategy(async (username, password, callback) => {
  try {
    const user = await getUser(username, password);
    if (!user) {
      return callback(null, false, { message: 'Incorrect username or password.' });
    }
    return callback(null, user);
  } catch (err) {
    return callback(err);
  }
}));

// Only the user id is stored in the session cookie's server-side session.
passport.serializeUser((user, callback) => {
  callback(null, user.id);
});

// On each request, rebuild req.user from the stored id.
passport.deserializeUser(async (id, callback) => {
  try {
    const user = await getUserById(id);
    callback(null, user);
  } catch (err) {
    callback(err, null);
  }
});

// --- Middleware ---
app.use(morgan('dev'));
app.use(express.json());

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

app.use(session({
  secret: 'last-race-change-this-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

// Guard for routes that require a logged-in user.
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// --- Authentication routes ---
// Login
app.post('/api/sessions', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || 'Login failed' });
    req.login(user, (err2) => {
      if (err2) return next(err2);
      return res.json(req.user);
    });
  })(req, res, next);
});

// Who am I? (used by the client on startup to restore the session)
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) res.json(req.user);
  else res.status(401).json({ error: 'Not authenticated' });
});

// Logout
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => res.status(200).end());
});

// --- Game routes ---
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Last Race server is up and running!' });
});

// Now protected: anonymous users must not see the map.
app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});