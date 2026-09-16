import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { locationService } from '../services/locationService';
import { auditService } from '../services/auditService';

const router = Router();

// Protect ALL location endpoints: Require valid JWT token AND DRIVER role
router.use(requireAuth);
router.use(requireRole('DRIVER'));

/**
 * GET /api/driver/location/status
 * Retrieve driver's current location sharing status, eligibility, and last location record
 */
router.get('/status', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const status = await locationService.getStatus(req.user!.id);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch location status', details: error.message });
  }
});

/**
 * POST /api/driver/location/start
 * Initiate live location sharing mode. Verifies server-side driver & vehicle eligibility.
 */
router.post('/start', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const eligibility = await locationService.verifyDriverEligibility(req.user!.id);

    if (!eligibility.eligible || !eligibility.vehicle) {
      res.status(403).json({
        success: false,
        error: eligibility.reason || 'Driver or vehicle is not eligible for location sharing.',
      });
      return;
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'DRIVER_LOCATION_START',
      entity: 'Vehicle',
      entityId: (eligibility.vehicle._id as object).toString(),
      ipAddress: req.ip,
      metadata: {
        vehicleId: eligibility.vehicle.vehicleId || eligibility.vehicle.shortVehicleNumber,
        driverMode: eligibility.driver.driverMode,
      },
    });

    res.json({
      success: true,
      message: 'Live location sharing initialized successfully.',
      sharingStatus: 'LOCATION_ACTIVE',
      vehicle: {
        id: (eligibility.vehicle._id as object).toString(),
        vehicleId: eligibility.vehicle.vehicleId || eligibility.vehicle.shortVehicleNumber,
        shortVehicleNumber: eligibility.vehicle.shortVehicleNumber,
        registrationNumber: eligibility.vehicle.registrationNumber,
        ownershipType: eligibility.vehicle.ownershipType,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to start location sharing', details: error.message });
  }
});

/**
 * POST /api/driver/location/update
 * Submit live GPS coordinate update for authenticated driver
 */
router.post('/update', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy, speed, heading, timestamp, source } = req.body;

    const result = await locationService.updateLocation(req.user!.id, {
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
      message: 'Location updated successfully.',
      vehicleId: result.vehicleId,
      timestamp: result.location?.timestamp,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to ingest location update', details: error.message });
  }
});

/**
 * POST /api/driver/location/stop
 * Stop live location sharing mode for authenticated driver
 */
router.post('/stop', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await locationService.stopLocation(req.user!.id);

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'DRIVER_LOCATION_STOP',
      entity: 'User',
      entityId: req.user!.id,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to stop location sharing', details: error.message });
  }
});

export default router;
