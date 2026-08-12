const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const connectDB = async (customUri) => {
  const uri = customUri || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dishaa_db';

  try {
    const conn = await mongoose.connect(uri, {
      autoIndex: true, // Automatically build indexes in development
      serverSelectionTimeoutMS: 2000, // Fail fast if MongoDB server is not running
    });

    console.log(`[DISHAA DB] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[DISHAA DB Error] Connection failed: ${error.message}`);
    throw error;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('[DISHAA DB] MongoDB Disconnected');
  } catch (error) {
    console.error(`[DISHAA DB Error] Disconnect failed: ${error.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
