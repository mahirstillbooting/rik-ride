import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { SavedLocation, SavedLocationType } from '../models/SavedLocation';

const router = Router();

// Protect ALL saved location endpoints with authentication
router.use(requireAuth);

/**
 * GET /api/passenger/saved-locations
 * Retrieve list of saved locations for authenticated passenger
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const locations = await SavedLocation.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: locations.length, locations });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch saved locations.' });
  }
});

/**
 * POST /api/passenger/saved-locations
 * Save a new address location for quick pickup/dropoff booking
 */
router.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, address, type, latitude, longitude } = req.body;

    if (!name || !address) {
      res.status(400).json({ success: false, error: 'Location name and address are required.' });
      return;
    }

    const lat = Number(latitude) || 23.8103;
    const lng = Number(longitude) || 90.4125;

    const newLocation = await SavedLocation.create({
      userId: req.user!.id,
      name: String(name).trim(),
      address: String(address).trim(),
      type: (type as SavedLocationType) || 'FAVORITE',
      latitude: lat,
      longitude: lng,
    });

    res.json({
      success: true,
      message: `Saved location "${newLocation.name}" added successfully.`,
      location: newLocation,
    });
  } catch (error: any) {
    console.error('[SavedLocationRoutes] Add error:', error);
    res.status(500).json({ success: false, error: 'Failed to save location.' });
  }
});

/**
 * DELETE /api/passenger/saved-locations/:id
 * Delete a saved location owned by the current authenticated passenger
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const deleted = await SavedLocation.findOneAndDelete({
      _id: id,
      userId: req.user!.id,
    });

    if (!deleted) {
      res.status(404).json({ success: false, error: 'Saved location not found or unauthorized.' });
      return;
    }

    res.json({ success: true, message: 'Saved location deleted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to delete saved location.' });
  }
});

export default router;
