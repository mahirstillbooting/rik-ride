import dotenv from 'dotenv';
import path from 'path';

// Load environment variables securely from root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev',
  qrHmacSecret: process.env.QR_HMAC_SECRET || 'fallback-qr-hmac-secret-for-dev',
  isDev: process.env.NODE_ENV !== 'production',
};

export function validateEnv(): void {
  if (!env.mongoUri) {
    throw new Error('[Config] MONGODB_URI is missing in environment variables.');
  }
}
