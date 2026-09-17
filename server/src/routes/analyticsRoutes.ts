import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { analyticsService, DateRangePreset, OwnershipFilter } from '../services/analyticsService';

const router = Router();

// Require valid JWT authentication AND ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

/**
 * GET /api/admin/analytics
 * Comprehensive operational analytics & aggregated statistics endpoint
 */
router.get('/analytics', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { range, startDate, endDate, garageId, ownershipType, vehicleId, driverId } = req.query;

    const data = await analyticsService.getAdminAnalytics({
      range: range as DateRangePreset | undefined,
      startDate: startDate ? String(startDate) : undefined,
      endDate: endDate ? String(endDate) : undefined,
      garageId: garageId ? String(garageId) : undefined,
      ownershipType: ownershipType as OwnershipFilter | undefined,
      vehicleId: vehicleId ? String(vehicleId) : undefined,
      driverId: driverId ? String(driverId) : undefined,
    });

    res.json(data);
  } catch (error: any) {
    console.error('Error fetching admin analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch admin analytics',
    });
  }
});

export default router;
