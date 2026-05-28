import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';     // ← Este es el más importante
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);