const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { checkValhallaHealth } = require('./services/valhallaService');
const placeRoutes = require('./routes/placeRoutes');
const navigationRoutes = require('./routes/navigationRoutes');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbStatus = dbStateMap[dbState] || 'unknown';

  const valhallaStatus = await checkValhallaHealth();

  return res.status(200).json({
    status: 'ok',
    service: 'DISHAA API',
    version: '2.0.0',
    database: dbStatus,
    valhalla: valhallaStatus.available ? 'available' : 'unavailable',
    valhallaMessage: valhallaStatus.message,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/places', placeRoutes);
app.use('/api/navigation', navigationRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[DISHAA API Error]', err.message);
  res.status(500).json({
    success: false,
    error: 'An unexpected error occurred. Please try again.',
  });
});

module.exports = app;
