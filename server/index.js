import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import LocalStrategy from 'passport-local';

import { getNetwork, getStations, getLines } from './dao/network-dao.js';
import { getUser, getUserById } from './dao/user-dao.js';
import { createGame, getGameById, finishGame, getEvents, getRanking } from './dao/game-dao.js';
import {
  chooseStartAndDest, listSegments, buildAdjacency, validateRoute, executeRoute,
} from './game-logic.js';

const app = express();
const PORT = 3001;
const STARTING_COINS = 20;

// --- Passport configuration ---
passport.use(new LocalStrategy(async (username, password, callback) => {
  try {
    const user = await getUser(username, password);
    if (!user) return callback(null, false, { message: 'Incorrect username or password.' });
    return callback(null, user);
  } catch (err) {
    return callback(err);
  }
}));

passport.serializeUser((user, callback) => callback(null, user.id));
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
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
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
app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    res.json(await getNetwork());
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});

// Start a new game: assign start/destination (shortest path >= 3) and return
// planning data WITHOUT any line/interchange information.
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

// Submit a route: validate it server-side, apply random events, score it and
// store the result. The server trusts only the start/destination it stored.
app.post('/api/games/:id/route', isLoggedIn, async (req, res) => {
  try {
    const gameId = Number(req.params.id);
    const game = await getGameById(gameId);

    // Ownership + state checks.
    if (!game || game.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Game not found.' });
    }
    if (game.status !== 'in_progress') {
      return res.status(409).json({ error: 'This game has already been completed.' });
    }

    const stations = await getStations();
    const lines = await getLines();
    const adj = buildAdjacency(lines);
    const byId = new Map(stations.map((s) => [s.id, s]));

    const validation = validateRoute(
      req.body?.route, game.start_station_id, game.dest_station_id, adj
    );

    if (!validation.valid) {
      await finishGame(gameId, 'failed', 0);
      return res.json({ valid: false, score: 0, steps: [] });
    }

    const route = req.body.route.map(([a, b]) => ({
      from: { id: a, name: byId.get(a).name },
      to: { id: b, name: byId.get(b).name },
    }));
    const events = await getEvents();
    const { steps, finalScore } = executeRoute(route, STARTING_COINS, events);
    await finishGame(gameId, 'completed', finalScore);

    res.json({
      valid: true,
      score: finalScore,
      start: { id: game.start_station_id, name: byId.get(game.start_station_id).name },
      destination: { id: game.dest_station_id, name: byId.get(game.dest_station_id).name },
      steps,
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not process the route.' });
  }
});

// General ranking (best score per user). Registered users only.
app.get('/api/ranking', isLoggedIn, async (req, res) => {
  try {
    res.json(await getRanking());
  } catch (err) {
    res.status(500).json({ error: 'Could not load the ranking.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});