import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { passengerLocationService } from '../services/passengerLocationService';
import { auditService } from '../services/auditService';

const router = Router();

// Protect ALL passenger location endpoints: Require valid JWT token AND PASSENGER role
router.use(requireAuth);
router.use(requireRole('PASSENGER'));

/**
 * GET /api/passenger/location/status
 * Retrieve passenger's current location sharing status and last location record
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await passengerLocationService.getStatus(req.user!.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch passenger location status', details: error.message });
  }
});

/**
 * GET /api/passenger/location/nearby-rickshaws
 * Discovery Radar: Fetch nearby operational available electric rickshaws for Passenger Radar
 */
router.get('/nearby-rickshaws', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const lat = req.query.latitude ? Number(req.query.latitude) : undefined;
    const lng = req.query.longitude ? Number(req.query.longitude) : undefined;
    const radiusKm = req.query.radiusKm ? Number(req.query.radiusKm) : 2;

    const result = await passengerLocationService.getNearbyAvailableRickshaws(lat, lng, radiusKm);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch nearby rickshaws', details: error.message });
  }
});

/**
 * POST /api/passenger/location/start
 * Initiate live location sharing mode for authenticated passenger.
 */
router.post('/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eligibility = await passengerLocationService.verifyPassengerEligibility(req.user!.id);

    if (!eligibility.eligible) {
      res.status(403).json({
        success: false,
        error: eligibility.reason || 'Passenger is not eligible for location sharing.',
      });
      return;
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'PASSENGER_LOCATION_START',
      entity: 'User',
      entityId: req.user!.id,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'Passenger live location sharing initialized successfully.',
      sharingStatus: 'LOCATION_ACTIVE',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to start passenger location sharing', details: error.message });
  }
});

/**
 * POST /api/passenger/location/update
 * Submit live GPS coordinate update for authenticated passenger
 */
router.post('/update', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy, speed, heading, timestamp, source } = req.body;

    const result = await passengerLocationService.updateLocation(req.user!.id, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      speed: speed !== undefined ? Number(speed) : undefined,
      heading: heading !== undefined ? Number(heading) : undefined,
      timestamp,
      source: source || 'DEVICE_GPS',
    });

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json({
      success: true,
      message: 'Passenger location updated successfully.',
      timestamp: result.location?.timestamp,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to ingest passenger location update', details: error.message });
  }
});

/**
 * POST /api/passenger/location/stop
 * Stop live location sharing mode for authenticated passenger
 */
router.post('/stop', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await passengerLocationService.stopLocation(req.user!.id);

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'PASSENGER_LOCATION_STOP',
      entity: 'User',
      entityId: req.user!.id,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to stop passenger location sharing', details: error.message });
  }
});

export default router;
