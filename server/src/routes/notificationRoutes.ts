import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { NotificationService } from '../services/notificationService';

const router = Router();

/**
 * GET /api/notifications
 * Fetch user notifications
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;

    const data = await NotificationService.getUserNotifications(userId, page, limit);
    return res.json({
      success: true,
      ...data,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch notifications',
    });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notificationId = req.params.id;

    const updated = await NotificationService.markAsRead(notificationId, userId);
    return res.json({
      success: true,
      updated,
    });
  } catch (error: any) {
    console.error('Error marking notification read:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark notification read',
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read for current user
 */
router.post('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await NotificationService.markAllAsRead(userId);
    return res.json({
      success: true,
      modifiedCount: count,
    });
  } catch (error: any) {
    console.error('Error marking all notifications read:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark all notifications read',
    });
  }
});

/**
 * POST /api/notifications/push-token
 * Register device Expo push token for authenticated user
 */
router.post('/push-token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { pushToken } = req.body;

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ success: false, error: 'Push token string is required.' });
    }

    const { User } = await import('../models/User');
    await User.findByIdAndUpdate(userId, { pushToken: pushToken.trim() });

    return res.json({
      success: true,
      message: 'Device push token registered successfully.',
    });
  } catch (error: any) {
    console.error('Error registering push token:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register push token',
    });
  }
});

export default router;
