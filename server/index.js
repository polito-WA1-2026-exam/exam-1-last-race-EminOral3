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
// LocalStrategy: verify username + password (calls user-dao which uses scrypt).
passport.use(new LocalStrategy(async (username, password, callback) => {
  try {
    const user = await getUser(username, password);
    if (!user) return callback(null, false, { message: 'Incorrect username or password.' });
    return callback(null, user);
  } catch (err) {
    return callback(err);
  }
}));

// Only store user.id in the session — never hash/salt.
passport.serializeUser((user, callback) => callback(null, user.id));

// On every request, rebuild req.user from the stored id.
passport.deserializeUser(async (id, callback) => {
  try {
    const user = await getUserById(id);
    callback(null, user);
  } catch (err) {
    callback(err, null);
  }
});

// --- Middleware ---
// Middleware order matters: morgan → json → cors → session → passport.
// The order is important: Passport cannot work without a session being established, 
// and req.user cannot exist without a Passport being established.
app.use(morgan('dev'));
app.use(express.json());

// Two-server pattern: client runs on :5173, server on :3001.
// credentials:true allows the session cookie to be sent cross-origin.
// '*' cannot be used with credentials:true.
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));

// Cookie-based session. Passport plugs into this to store the user id.
app.use(session({
  secret: 'last-race-change-this-secret',
  resave: false,
  saveUninitialized: false,
}));
app.use(passport.authenticate('session'));

// Middleware to protect routes: returns 401 if not authenticated.
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  return res.status(401).json({ error: 'Not authenticated' });
}

// --- Authentication routes ---

// Login. Custom callback to return 401 JSON instead of a redirect.
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

// Session check on page load. 401 = no session (expected, not an error).
app.get('/api/sessions/current', (req, res) => {
  if (req.isAuthenticated()) res.json(req.user);
  else res.status(401).json({ error: 'Not authenticated' });
});

// Logout. req.logout() is Passport's session-clearing method.
// DELETE /api/sessions/current removes the session → the server deletes the session with req.logout() 
// → the user becomes null on the client side → the NavBar switches to guest mode.
app.delete('/api/sessions/current', (req, res) => {
  req.logout(() => res.status(200).end());
});

// --- Game routes ---

// network-dao.js -> Retrieves all stations from the database (getStations)
// network-dao.js -> Retrieves all lines from the database (getLines)
// All this data is returned as a single JSON file.
app.get('/api/network', isLoggedIn, async (req, res) => {
  try {
    res.json(await getNetwork());
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});


// Start a game. Server picks start/dest via BFS (≥3 segments apart).
// No line info is returned — player must reconstruct the network mentally.
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
      return res.status(409).json({ error: 'This game has already been completed.' }); // Same game cannot be submitted twice.
    }

    const stations = await getStations();
    const lines = await getLines();
    const adj = buildAdjacency(lines); // adjacency graph rebuilt
    const byId = new Map(stations.map((s) => [s.id, s]));

    // ValidateRoute() runs — 5 rules are checked: 1. Not empty - 2. Every segment is a real edge
    // 3. Consecutive segments are connected (connected walk) - 4. No segment is reused
    // 5. Last stop = Destination.
    const validation = validateRoute(
      req.body?.route, game.start_station_id, game.dest_station_id, adj
    );

    if (!validation.valid) {
      await finishGame(gameId, 'failed', 0);
      return res.json({ valid: false, score: 0, steps: [] });
    }

    // If valid → executeRoute() runs: a random event is retrieved from the DB for each segment, the total number of coins is calculated,
    // negative scores are prevented with Math.max(0, coins) → finishGame(id, 'completed', score) → results are returned step by step.

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