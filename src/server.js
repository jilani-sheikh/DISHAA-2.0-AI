const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.warn('[DISHAA API] MongoDB not connected at startup, running in degraded DB mode:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`[DISHAA API] Server running on http://localhost:${PORT}`);
    console.log(`[DISHAA API] Health check: http://localhost:${PORT}/api/health`);
  });
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[DISHAA API] SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[DISHAA API] SIGINT received — shutting down gracefully');
  process.exit(0);
});

start();
