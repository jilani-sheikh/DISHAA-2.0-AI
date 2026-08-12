const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 3000;

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`[DISHAA API] Server running on http://localhost:${PORT}`);
      console.log(`[DISHAA API] Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[DISHAA API] Failed to start server:', err.message);
    process.exit(1);
  }
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
