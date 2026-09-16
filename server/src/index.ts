import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { env, validateEnv } from './config/env';
import { connectDatabase } from './config/db';
import { socketManager } from './sockets/socketManager';
import { qrService } from './services/qrService';
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import garageRoutes from './routes/garageRoutes';
import driverRoutes from './routes/driverRoutes';
import locationRoutes from './routes/locationRoutes';
import passengerLocationRoutes from './routes/passengerLocationRoutes';

validateEnv();

const app = express();
const PORT = env.port;

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver/location', locationRoutes);
app.use('/api/passenger/location', passengerLocationRoutes);

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
