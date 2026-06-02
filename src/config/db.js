import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;

/**
 * Establishes connection to MongoDB.
 * Catches errors to ensure the server doesn't crash if MongoDB is temporarily unavailable.
 */
export const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/stock_sentiment';
  
  try {
    console.log(`[Database] Attempting to connect to MongoDB at: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
    const db = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000 // 5 seconds timeout
    });

    isConnected = db.connections[0].readyState === 1;
    console.log('[Database] MongoDB connected successfully.');
  } catch (error) {
    console.error('[Database] MongoDB connection failed:', error.message);
    console.warn('[Database] Application will run in DEGRADED MODE (no database caching/rate limits).');
    isConnected = false;
  }
};

/**
 * Checks if the database is currently connected.
 * @returns {boolean} Connection status
 */
export const isDbConnected = () => isConnected;
