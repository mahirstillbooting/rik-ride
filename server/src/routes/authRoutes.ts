import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { User, UserRole, DriverOperatingMode, AccountStatus } from '../models/User';
import { env } from '../config/env';

const router = Router();

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns signed JWT token.
 */
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, password } = req.body;
    const result = await authService.login(identifier, password);

    if (!result.success) {
      res.status(result.accountStatus ? 403 : 401).json(result);
      return;
    }

    res.json(result);
  } catch (error) {
    console.error('[AuthRoutes] Login error:', error);
    res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

/**
 * GET /api/auth/me
 * Returns current authenticated user session details.
 */
router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response): void => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /api/auth/seed-dev
 * Development-only endpoint to seed initial test accounts for testing.
 * Disabled in production environment.
 */
router.post('/seed-dev', async (req: Request, res: Response): Promise<void> => {
  if (!env.isDev) {
    res.status(403).json({ error: 'Seeding accounts is only enabled in development mode.' });
    return;
  }

  try {
    const defaultPassword = 'Password123!';
    const passwordHash = await authService.hashPassword(defaultPassword);

    const testUsers: {
      phone: string;
      name: string;
      email: string;
      role: UserRole;
      driverMode?: DriverOperatingMode;
      accountStatus: AccountStatus;
    }[] = [
      {
        phone: '01700000001',
        name: 'System Administrator',
        email: 'admin@rikride.com',
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
      },
      {
        phone: '01700000002',
        name: 'Dhaka Central Garage Owner',
        email: 'garage@rikride.com',
        role: 'GARAGE_OWNER',
        accountStatus: 'ACTIVE',
      },
      {
        phone: '01700000003',
        name: 'Rahim (Garage Driver)',
        email: 'gdriver@rikride.com',
        role: 'DRIVER',
        driverMode: 'GARAGE_REGISTERED',
        accountStatus: 'ACTIVE',
      },
      {
        phone: '01700000004',
        name: 'Karim (Self-Owned Driver)',
        email: 'idriver@rikride.com',
        role: 'DRIVER',
        driverMode: 'SELF_OWNED',
        accountStatus: 'ACTIVE',
      },
      {
        phone: '01700000005',
        name: 'Anika (Passenger)',
        email: 'passenger@rikride.com',
        role: 'PASSENGER',
        accountStatus: 'ACTIVE',
      },
      {
        phone: '01700000006',
        name: 'Pending Garage Applicant',
        email: 'pending@rikride.com',
        role: 'GARAGE_OWNER',
        accountStatus: 'PENDING',
      },
      {
        phone: '01700000007',
        name: 'Suspended Driver Account',
        email: 'suspended@rikride.com',
        role: 'DRIVER',
        driverMode: 'SELF_OWNED',
        accountStatus: 'SUSPENDED',
      },
    ];

    const results = [];
    for (const u of testUsers) {
      const updated = await User.findOneAndUpdate(
        { phone: u.phone },
        {
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role,
          driverMode: u.driverMode,
          accountStatus: u.accountStatus,
        },
        { upsert: true, new: true }
      );
      results.push({ phone: updated.phone, role: updated.role, status: updated.accountStatus });
    }

    res.json({
      success: true,
      message: 'Development test accounts seeded successfully!',
      defaultPassword,
      accounts: results,
    });
  } catch (error) {
    console.error('[AuthRoutes] Seed error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed test accounts' });
  }
});

export default router;
