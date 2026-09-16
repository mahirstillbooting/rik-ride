import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { User, AccountStatus, UserRole } from '../models/User';
import { Garage, VerificationStatus } from '../models/Garage';
import { Vehicle, VehicleVerificationStatus } from '../models/Vehicle';
import { auditService } from '../services/auditService';
import { passengerLocationService } from '../services/passengerLocationService';

const router = Router();

// Protect ALL admin endpoints: Require valid JWT token AND ADMIN role
router.use(requireAuth);
router.use(requireRole('ADMIN'));

/**
 * GET /api/admin/stats
 * Efficient consolidated aggregation endpoint for Admin Overview counts
 */
router.get('/stats', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      passengers,
      garageOwners,
      drivers,
      garageRegisteredDrivers,
      selfOwnedDrivers,
      garages,
      vehicles,
      pendingUsers,
      pendingGarages,
      pendingVehicles,
      activeUsers,
      approvedGarages,
      approvedVehicles,
      suspendedUsers,
      suspendedGarages,
      suspendedVehicles,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'PASSENGER' }),
      User.countDocuments({ role: 'GARAGE_OWNER' }),
      User.countDocuments({ role: 'DRIVER' }),
      User.countDocuments({ role: 'DRIVER', driverMode: 'GARAGE_REGISTERED' }),
      User.countDocuments({ role: 'DRIVER', driverMode: 'SELF_OWNED' }),
      Garage.countDocuments(),
      Vehicle.countDocuments(),

      User.countDocuments({ accountStatus: 'PENDING' }),
      Garage.countDocuments({ verificationStatus: 'PENDING' }),
      Vehicle.countDocuments({ verificationStatus: 'PENDING' }),

      User.countDocuments({ accountStatus: 'ACTIVE' }),
      Garage.countDocuments({ verificationStatus: 'APPROVED' }),
      Vehicle.countDocuments({ verificationStatus: 'APPROVED' }),

      User.countDocuments({ accountStatus: 'SUSPENDED' }),
      Garage.countDocuments({ verificationStatus: 'SUSPENDED' }),
      Vehicle.countDocuments({ verificationStatus: 'SUSPENDED' }),
    ]);

    res.json({
      success: true,
      stats: {
        totalUsers,
        passengers,
        garageOwners,
        drivers,
        garageRegisteredDrivers,
        selfOwnedDrivers,
        garages,
        vehicles,
        pendingApprovals: pendingUsers + pendingGarages + pendingVehicles,
        activeEntities: activeUsers + approvedGarages + approvedVehicles,
        suspendedEntities: suspendedUsers + suspendedGarages + suspendedVehicles,
        breakdown: {
          pendingUsers,
          pendingGarages,
          pendingVehicles,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to aggregate admin statistics', details: error.message });
  }
});

/**
 * GET /api/admin/pending
 * Retrieve unified list of pending approvals across users, garages, and vehicles
 */
router.get('/pending', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [pendingUsers, pendingGarages, pendingVehicles] = await Promise.all([
      User.find({ accountStatus: 'PENDING' }).select('name phone role driverMode nidNumber nidStatus city area createdAt').lean(),
      Garage.find({ verificationStatus: 'PENDING' }).populate('ownerId', 'name phone').lean(),
      Vehicle.find({ verificationStatus: 'PENDING' })
        .populate('assignedDriverId', 'name phone')
        .populate('garageId', 'garageId name')
        .lean(),
    ]);

    const queue = [
      ...pendingUsers.map((u: any) => ({
        id: u._id.toString(),
        entityType: 'USER',
        title: u.name,
        subtitle: `Role: ${u.role}${u.driverMode ? ` (${u.driverMode})` : ''}${u.nidNumber ? ` | NID: ${u.nidNumber}` : ''}`,
        phone: u.phone,
        nidNumber: u.nidNumber || null,
        city: u.city || 'Dhaka',
        area: u.area || '',
        status: u.accountStatus,
        createdAt: u.createdAt,
      })),
      ...pendingGarages.map((g: any) => ({
        id: g._id.toString(),
        garageId: g.garageId || 'DH-GAR-0001',
        entityType: 'GARAGE',
        title: `${g.name} (${g.garageId || 'DH-GAR-0001'})`,
        subtitle: `Owner: ${g.ownerId?.name || 'Unknown'} (${g.ownerId?.phone || g.phone}) | ${g.city || 'Dhaka'}`,
        phone: g.phone,
        address: g.address,
        city: g.city || 'Dhaka',
        area: g.area || '',
        status: g.verificationStatus,
        createdAt: g.createdAt,
      })),
      ...pendingVehicles.map((v: any) => ({
        id: v._id.toString(),
        vehicleId: v.vehicleId || v.shortVehicleNumber,
        garageCustomId: v.garageCustomId || v.garageId?.garageId || null,
        entityType: 'VEHICLE',
        title: `Vehicle ${v.vehicleId || v.shortVehicleNumber}`,
        subtitle: `Reg: ${v.registrationNumber} | Mode: ${v.ownershipType}`,
        driverName: v.assignedDriverId?.name,
        garageName: v.garageId?.name,
        status: v.verificationStatus,
        createdAt: v.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, count: queue.length, queue });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch pending approval queue', details: error.message });
  }
});

/**
 * GET /api/admin/users
 * Query users with role / status filtering
 */
router.get('/users', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role, status, search } = req.query;
    const filter: any = {};

    if (role) filter.role = role as UserRole;
    if (status) filter.accountStatus = status as AccountStatus;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

/**
 * GET /api/admin/garages
 * Query garages with owner details
 */
router.get('/garages', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.verificationStatus = status as VerificationStatus;

    const garages = await Garage.find(filter)
      .populate('ownerId', 'name phone email accountStatus')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: garages.length, garages });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch garages', details: error.message });
  }
});

/**
 * GET /api/admin/drivers
 * Query drivers with driverMode distinction
 */
router.get('/drivers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { driverMode, status } = req.query;
    const filter: any = { role: 'DRIVER' };
    if (driverMode) filter.driverMode = driverMode;
    if (status) filter.accountStatus = status;

    const drivers = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: drivers.length, drivers });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch drivers', details: error.message });
  }
});

/**
 * GET /api/admin/vehicles
 * Query vehicles displaying short vehicle number
 */
router.get('/vehicles', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, ownershipType } = req.query;
    const filter: any = {};
    if (status) filter.verificationStatus = status as VehicleVerificationStatus;
    if (ownershipType) filter.ownershipType = ownershipType;

    const vehicles = await Vehicle.find(filter)
      .populate('assignedDriverId', 'name phone driverMode')
      .populate('garageId', 'name phone')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
  }
});

/**
 * POST /api/admin/approval
 * Central secured action endpoint to APPROVE, REJECT, or SUSPEND an entity
 */
router.post('/approval', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { entityType, entityId, action, reason } = req.body;

    if (!entityType || !entityId || !action) {
      res.status(400).json({ error: 'Missing required parameters: entityType, entityId, action' });
      return;
    }

    if (!['APPROVE', 'REJECT', 'SUSPEND'].includes(action)) {
      res.status(400).json({ error: 'Invalid action. Allowed: APPROVE, REJECT, SUSPEND' });
      return;
    }

    let targetEntityName = '';
    let previousStatus = '';
    let newStatus = '';

    if (entityType === 'USER') {
      const user = await User.findById(entityId);
      if (!user) {
        res.status(404).json({ error: 'User entity not found' });
        return;
      }

      previousStatus = user.accountStatus;
      newStatus = action === 'APPROVE' ? 'ACTIVE' : action === 'REJECT' ? 'REJECTED' : 'SUSPENDED';

      user.accountStatus = newStatus as AccountStatus;
      await user.save();
      targetEntityName = `User: ${user.name} (${user.role})`;
    } else if (entityType === 'GARAGE') {
      const garage = await Garage.findById(entityId);
      if (!garage) {
        res.status(404).json({ error: 'Garage entity not found' });
        return;
      }

      previousStatus = garage.verificationStatus;
      newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'SUSPENDED';

      garage.verificationStatus = newStatus as VerificationStatus;
      await garage.save();
      targetEntityName = `Garage: ${garage.name}`;
    } else if (entityType === 'VEHICLE') {
      const vehicle = await Vehicle.findById(entityId);
      if (!vehicle) {
        res.status(404).json({ error: 'Vehicle entity not found' });
        return;
      }

      previousStatus = vehicle.verificationStatus;
      newStatus = action === 'APPROVE' ? 'APPROVED' : action === 'REJECT' ? 'REJECTED' : 'SUSPENDED';

      vehicle.verificationStatus = newStatus as VehicleVerificationStatus;
      await vehicle.save();
      targetEntityName = `Vehicle: ${vehicle.shortVehicleNumber || vehicle.registrationNumber}`;
    } else {
      res.status(400).json({ error: 'Unsupported entityType. Allowed: USER, GARAGE, VEHICLE' });
      return;
    }

    // Write Audit Log
    await auditService.logAction({
      actorId: req.user!.id,
      action: `${action}_${entityType}`,
      entity: entityType,
      entityId,
      ipAddress: req.ip,
      metadata: {
        targetEntityName,
        previousStatus,
        newStatus,
        reason: reason || 'Admin manual review action',
      },
    });

    res.json({
      success: true,
      message: `${targetEntityName} successfully updated from ${previousStatus} to ${newStatus}`,
      entityType,
      entityId,
      previousStatus,
      newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process approval action', details: error.message });
  }
});

/**
 * GET /api/admin/audit-logs
 * Fetch immutable admin audit log stream
 */
router.get('/audit-logs', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const result = await auditService.getRecentLogs(limit, page);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch audit logs', details: error.message });
  }
});

import { rideService } from '../services/rideService';

/**
 * GET /api/admin/locations
 * Fetch real-time active driver and active passenger locations for authorized Admin monitoring
 */
router.get('/locations', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const locations = await passengerLocationService.getActiveFleetAndPassengerLocations();
    res.json(locations);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch active fleet and passenger locations', details: error.message });
  }
});

/**
 * GET /api/admin/rides
 * Fetch all active operational rides for Admin command center view
 */
router.get('/rides', async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const rides = await rideService.getAdminActiveRides();
    res.json(rides);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch active rides', details: error.message });
  }
});

export default router;
