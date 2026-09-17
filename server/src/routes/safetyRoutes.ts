import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { safetyService } from '../services/safetyService';

const router = Router();

// Protect ALL safety endpoints with JWT authentication
router.use(requireAuth);

/**
 * POST /api/safety/yellow
 * Passenger activates Yellow Safety Alert during active ride
 */
router.post('/yellow', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId, latitude, longitude, accuracy } = req.body;
    const locationPayload = latitude !== undefined && longitude !== undefined ? {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
    } : undefined;

    const result = await safetyService.triggerYellowAlert(req.user!.id, rideId, locationPayload);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(result.statusCode || 201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to trigger Yellow Safety Alert', details: error.message });
  }
});

/**
 * POST /api/safety/red
 * Passenger activates Red Emergency SOS during active ride
 */
router.post('/red', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId, latitude, longitude, accuracy } = req.body;
    const locationPayload = latitude !== undefined && longitude !== undefined ? {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
    } : undefined;

    const result = await safetyService.triggerRedSOS(req.user!.id, rideId, locationPayload);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(result.statusCode || 201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to trigger Red Emergency SOS', details: error.message });
  }
});

/**
 * POST /api/safety/override-terminate
 * Passenger exercises unilateral safety override to abort tracking and terminate active ride
 */
router.post('/override-terminate', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId, reason } = req.body;

    const result = await safetyService.passengerUnilateralOverride(req.user!.id, rideId, reason);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.status(result.statusCode || 200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to process passenger safety override', details: error.message });
  }
});

/**
 * GET /api/safety/active
 * Admin monitoring endpoint: Fetch all active safety events
 */
router.get('/active', requireRole('ADMIN'), async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await safetyService.getActiveSafetyEvents();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch active safety events', details: error.message });
  }
});

/**
 * POST /api/safety/:eventId/acknowledge
 * Admin acknowledges an active safety event
 */
router.post('/:eventId/acknowledge', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const result = await safetyService.acknowledgeSafetyEvent(req.user!.id, eventId);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to acknowledge safety event', details: error.message });
  }
});

/**
 * POST /api/safety/:eventId/resolve
 * Admin resolves a safety event
 */
router.post('/:eventId/resolve', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const { notes } = req.body;

    const result = await safetyService.resolveSafetyEvent(req.user!.id, eventId, notes);

    if (!result.success) {
      res.status(result.statusCode || 400).json(result);
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to resolve safety event', details: error.message });
  }
});

export default router;
