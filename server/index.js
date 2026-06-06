import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import session from 'express-session';

import { getNetwork } from './dao/network-dao.js';

const app = express();
const PORT = 3001;

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

// --- Routes ---
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Last Race server is up and running!' });
});

// Full network map for the Setup phase.
// NOTE: this will be protected (login required) in Phase 3, since anonymous
// users must not see the map.
app.get('/api/network', async (req, res) => {
  try {
    const network = await getNetwork();
    res.json(network);
  } catch (err) {
    res.status(500).json({ error: 'Database error while loading the network.' });
  }
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
});