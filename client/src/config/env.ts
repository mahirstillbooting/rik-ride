/**
 * Client Environment Variables Loader
 * Uses EXPO_PUBLIC_ prefixed environment variables without exposing sensitive credentials.
 */

export const env = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
  wsUrl: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:5000',
  isDev: process.env.NODE_ENV !== 'production',
};
