import express from 'express';
import cors from 'cors';
import path from 'path';
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
import rideRoutes from './routes/rideRoutes';
import safetyRoutes from './routes/safetyRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import notificationRoutes from './routes/notificationRoutes';
import qrRoutes from './routes/qrRoutes';
import uploadRoutes from './routes/uploadRoutes';
import supportTicketRoutes from './routes/supportTicketRoutes';

validateEnv();

const app = express();
const PORT = env.port;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve Uploads Directory statically
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// Register API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', analyticsRoutes);
app.use('/api/garage', garageRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/driver/location', locationRoutes);
app.use('/api/passenger/location', passengerLocationRoutes);
app.use('/api/ride', rideRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/support-tickets', supportTicketRoutes);

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
