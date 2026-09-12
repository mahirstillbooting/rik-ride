import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/db';
import { socketManager } from './sockets/socketManager';
import { qrService } from './services/qrService';

validateEnv();

const app = express();
const PORT = env.port;

app.use(cors());
app.use(express.json());

// Health & Verification Endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    app: 'RIK-RIDE Server Foundation',
    databaseTarget: 'rik_ride',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// QR Security Verification Endpoint Placeholder
app.get('/api/qr/verify/:token', (req, res) => {
  const { token } = req.params;
  const result = qrService.verifyToken(token);
  res.json(result);
});

const httpServer = createServer(app);

// Initialize WebSockets for real-time tracking foundation
socketManager.initialize(httpServer);

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, async () => {
    console.log(`[Server] RIK-RIDE backend running on port ${PORT}`);
    try {
      await connectDatabase();
    } catch (err) {
      console.error('[Server] Database initialization deferred:', err);
    }
  });
}

export { app, httpServer };
