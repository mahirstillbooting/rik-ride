import dotenv from 'dotenv';
import path from 'path';

// Load environment variables securely from root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { socketManager } from './sockets/socketManager';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'RIK-RIDE Server Foundation',
    timestamp: new Date().toISOString(),
  });
});

const httpServer = createServer(app);

// Initialize WebSockets for real-time tracking foundation
socketManager.initialize(httpServer);

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`[Server] RIK-RIDE backend foundation running on port ${PORT}`);
  });
}

export { app, httpServer };
