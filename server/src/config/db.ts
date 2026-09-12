import mongoose from 'mongoose';
import { env } from './env';
import '../models'; // Import all models to register schemas & 2dsphere indexes

/**
 * MongoDB Atlas Database Connection Manager
 * Connects securely to target database: rik_ride using process.env.MONGODB_URI.
 * Automatically synchronizes Mongoose model indexes (including 2dsphere and unique constraints).
 */
export async function connectDatabase(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error('[Database] MONGODB_URI environment variable is missing.');
  }

  try {
    await mongoose.connect(env.mongoUri, {
      dbName: 'rik_ride',
    });

    console.log('[Database] Connected to MongoDB Atlas (database: rik_ride)');

    // Ensure all Mongoose model indexes (unique & 2dsphere) are synchronized
    await Promise.all(
      Object.values(mongoose.models).map(async (model) => {
        await model.syncIndexes();
      })
    );
    console.log('[Database] All model indexes (2dsphere & unique constraints) successfully synchronized.');
  } catch (error) {
    console.error('[Database] MongoDB Atlas connection error:', error);
    throw error;
  }
}
