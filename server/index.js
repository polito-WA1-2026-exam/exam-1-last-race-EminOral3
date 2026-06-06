// imports
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(morgan('dev'));          // request logging in the console
app.use(express.json());         // parse JSON request bodies

// CORS: the "two servers" pattern. The React dev server runs on a different
// origin (:5173) and must be allowed to send the session cookie, so we set a
// specific origin (not "*") together with credentials: true.
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

// Session middleware. Passport will plug into this in a later phase; for now
// it just sets up the cookie-based session machinery.
app.use(session({
  secret: 'last-race-change-this-secret',
  resave: false,
  saveUninitialized: false,
}));

// --- Routes ---
// Smoke-test endpoint: lets the client verify the connection and CORS setup.
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Last Race server is up and running!' });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});
