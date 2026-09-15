const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const { checkValhallaHealth } = require('./services/valhallaService');
const { getAiHealth } = require('./services/ai/aiProvider');
const placeRoutes = require('./routes/placeRoutes');
const navigationRoutes = require('./routes/navigationRoutes');
const aiRoutes = require('./routes/aiRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const app = express();

// ─── Middleware ──────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : null;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests or same-origin without origin header
    if (!origin) return callback(null, true);

    if (!allowedOrigins || allowedOrigins.includes('*')) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (such as indoor-viewer) from frontend public directory
const publicDir = path.join(__dirname, '../DISHAA---VIRTUAL-CAMPUS-MAP/public');
app.use(express.static(publicDir));

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
  const dbStateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const dbStatus = dbStateMap[dbState] || 'unknown';

  const valhallaStatus = await checkValhallaHealth();
  const aiStatus = await getAiHealth();

  return res.status(200).json({
    status: 'ok',
    service: 'DISHAA API',
    version: '2.0.0',
    database: dbStatus,
    valhalla: valhallaStatus.available ? 'available' : 'unavailable',
    valhallaMessage: valhallaStatus.message,
    ai: aiStatus.available ? 'available' : 'unavailable',
    aiMessage: aiStatus.message,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api/places', placeRoutes);
app.use('/api/navigation', navigationRoutes);
app.use('/api/assistant', aiRoutes);
app.use('/api/faculty', facultyRoutes);

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
