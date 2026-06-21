import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

createRoot(document.getElementById('root')).render(

  // StrictMode: (React's quality control mode. It double-runs everything in the development phase, catching bugs early)
  // BrowserRouter: (URL management — which page opens when a particular address is visited)
  // App.jsx: The rest of the application.
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);