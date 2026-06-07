import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';

import { getNetwork, getStations, getLines } from './dao/network-dao.js';
import { getUser, getUserById } from './dao/user-dao.js';
import { createGame } from './dao/game-dao.js';
import { chooseStartAndDest, listSegments } from './game-logic.js';

const app = express();
const PORT = 3001;

// --- Passport configuration ---
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

passport.serializeUser((user, callback) => {
  callback(null, user.id);
});

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

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// --- Authentication routes ---
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

app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) res.json(req.user);
  else res.status(401).json({ error: 'Not authenticated' });
});

app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => res.status(200).end());
});

// --- Game routes ---
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Last Race server is up and running!' });
});

// Full network for the Setup phase (login required: anonymous users can't see the map).
app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});

// Start a new game: the server assigns start/destination (shortest path >= 3)
// and returns the planning data. It deliberately omits all line information and
// the interchange flag, so the client cannot reconstruct the map for free.
app.post('/api/games', isLoggedIn, async (req, res) => {
  try {
    const stations = await getStations();
    const lines = await getLines();

    const { startId, destId } = chooseStartAndDest(stations, lines, 3);
    const gameId = await createGame(req.user.id, startId, destId);

    const byId = new Map(stations.map((s) => [s.id, s]));
    const pick = (s) => ({ id: s.id, name: s.name, x: s.x, y: s.y });

    const segments = listSegments(lines)
      .map((seg) => ({
        from: { id: seg.a, name: byId.get(seg.a).name },
        to: { id: seg.b, name: byId.get(seg.b).name },
      }))
      .sort((p, q) =>
        p.from.name.localeCompare(q.from.name) || p.to.name.localeCompare(q.to.name)
      );

    res.json({
      gameId,
      start: pick(byId.get(startId)),
      destination: pick(byId.get(destId)),
      stations: stations.map((s) => ({ id: s.id, name: s.name, x: s.x, y: s.y })),
      segments,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not start a new game.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});