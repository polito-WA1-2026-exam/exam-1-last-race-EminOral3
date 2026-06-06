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

// init express
const app = new express();
const port = 3001;

// activate the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
