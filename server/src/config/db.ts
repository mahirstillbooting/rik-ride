import mongoose from 'mongoose';

/**
 * MongoDB Atlas Connection Manager
 * Securely reads connection string from process.env.MONGODB_URI.
 * Targets database: rik_ride
 */
export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined in .env');
  }

  try {
    await mongoose.connect(mongoUri, {
      dbName: 'rik_ride',
    });
    console.log('[Database] Successfully connected to MongoDB Atlas (database: rik_ride)');
  } catch (error) {
    console.error('[Database] MongoDB Atlas connection error:', error);
    throw error;
  }
}
