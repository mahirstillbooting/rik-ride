import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { rideService } from '../services/rideService';
import { auditService } from '../services/auditService';

const router = Router();

// Protect ALL ride endpoints: Require valid JWT token
router.use(requireAuth);

// -------------------------------------------------------------
// PASSENGER RIDE ENDPOINTS
// -------------------------------------------------------------

/**
 * POST /api/ride/request
 * Passenger creates a new ride request with current GPS pickup coordinates
 */
router.post('/request', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { latitude, longitude, accuracy, destinationText, targetVehicleId, targetDriverId } = req.body;

    const result = await rideService.createRideRequest(req.user!.id, {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy !== undefined ? Number(accuracy) : undefined,
      destinationText,
      targetVehicleId,
      targetDriverId,
    });

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error, ride: result.ride });
      return;
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'PASSENGER_RIDE_REQUEST',
      entity: 'Ride',
      entityId: result.ride!.id,
      ipAddress: req.ip,
      metadata: { rideId: result.ride!.rideId, pseudonym: result.ride!.passengerPseudonym },
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to create ride request', details: error.message });
  }
});

/**
 * GET /api/ride/passenger/active
 * Retrieve current active ride status for authenticated passenger
 */
router.get('/passenger/active', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await rideService.getPassengerActiveRide(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch active passenger ride', details: error.message });
  }
});

/**
 * POST /api/ride/passenger/confirm-completion
 * Passenger confirms drop-off completion (sets official endCoordinates from real GPS)
 */
router.post('/passenger/confirm-completion', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.confirmCompletionByPassenger(req.user!.id, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'PASSENGER_RIDE_CONFIRM_COMPLETION',
      entity: 'Ride',
      entityId: rideId,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to confirm ride completion', details: error.message });
  }
});

/**
 * POST /api/ride/passenger/cancel
 * Passenger cancels an initiated or accepted ride request
 */
router.post('/passenger/cancel', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId, reason } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.cancelPassengerRide(req.user!.id, rideId, reason);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to cancel ride request', details: error.message });
  }
});

// -------------------------------------------------------------
// DRIVER RIDE ENDPOINTS
// -------------------------------------------------------------

/**
 * GET /api/ride/driver/pending
 * Retrieve pending ride requests for eligible driver (within 15s window, approximate pickup area only)
 */
router.get('/driver/pending', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await rideService.getPendingRequestsForDriver(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch pending ride requests', details: error.message });
  }
});

/**
 * POST /api/ride/driver/decline
 * Driver declines a targeted pending ride request
 */
router.post('/driver/decline', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.declineDriverRide(req.user!.id, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to decline ride request', details: error.message });
  }
});

/**
 * POST /api/ride/driver/accept
 * Atomic first-trigger-wins dispatch acceptance by driver
 */
router.post('/driver/accept', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.acceptRideAtomically(req.user!.id, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'DRIVER_RIDE_ACCEPT',
      entity: 'Ride',
      entityId: rideId,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to accept ride request', details: error.message });
  }
});

/**
 * POST /api/ride/driver/start
 * Driver starts active trip
 */
router.post('/driver/start', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.startRide(req.user!.id, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to start trip', details: error.message });
  }
});

/**
 * POST /api/ride/driver/request-completion
 * Driver requests trip completion (Validated against vehicle GPS speed <= 10 km/h)
 */
router.post('/driver/request-completion', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID is required' });
      return;
    }

    const result = await rideService.requestCompletion(req.user!.id, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to request trip completion', details: error.message });
  }
});

/**
 * GET /api/ride/driver/active
 * Retrieve assigned active trip for authenticated driver
 */
router.get('/driver/active', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await rideService.getDriverActiveRide(req.user!.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch active driver trip', details: error.message });
  }
});

// -------------------------------------------------------------
// TRIP HISTORY & JOURNEY RECORD ENDPOINTS
// -------------------------------------------------------------

/**
 * GET /api/ride/passenger/history
 * Fetch paginated completed trip history for authenticated passenger
 */
router.get('/passenger/history', requireRole('PASSENGER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, startDate, endDate } = req.query;
    const result = await rideService.getPassengerTripHistory(req.user!.id, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch passenger trip history', details: error.message });
  }
});

/**
 * GET /api/ride/driver/history
 * Fetch paginated completed trip history for authenticated driver
 */
router.get('/driver/history', requireRole('DRIVER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page, limit, startDate, endDate } = req.query;
    const result = await rideService.getDriverTripHistory(req.user!.id, {
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      startDate: startDate as string,
      endDate: endDate as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch driver trip history', details: error.message });
  }
});

/**
 * GET /api/ride/garage/history
 * Fetch completed trip history for garage owner's registered vehicles and drivers
 */
router.get('/garage/history', requireRole('GARAGE_OWNER'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { vehicleId, driverId, startDate, endDate, page, limit } = req.query;
    const result = await rideService.getGarageTripHistory(req.user!.id, {
      vehicleId: vehicleId as string,
      driverId: driverId as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch garage trip history', details: error.message });
  }
});

/**
 * GET /api/ride/admin/history
 * Fetch operational completed trip history with search and filtering for Admin
 */
router.get('/admin/history', requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { search, vehicleId, driverId, garageId, status, hasSafetyEvent, startDate, endDate, page, limit } = req.query;
    const result = await rideService.getAdminTripHistory({
      search: search as string,
      vehicleId: vehicleId as string,
      driverId: driverId as string,
      garageId: garageId as string,
      status: status as string,
      hasSafetyEvent: hasSafetyEvent as string,
      startDate: startDate as string,
      endDate: endDate as string,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch admin trip history', details: error.message });
  }
});

/**
 * GET /api/ride/detail/:id
 * Retrieve detailed trip record & route telemetry by ride ID with strict IDOR role authorization
 */
router.get('/detail/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rideId = req.params.id;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'Ride ID parameter is required' });
      return;
    }

    const result = await rideService.getTripDetailById(req.user!.id, req.user!.role, rideId);

    if (!result.success) {
      res.status(result.statusCode || 400).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch trip detail', details: error.message });
  }
});

export default router;
