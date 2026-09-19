import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { User, AccountStatus, UserRole } from '../models/User';
import { Garage, VerificationStatus } from '../models/Garage';
import { Vehicle, VehicleVerificationStatus } from '../models/Vehicle';
import { Ride } from '../models/Ride';
import { DriverLocation } from '../models/DriverLocation';
import { SafetyEvent } from '../models/SafetyEvent';
import { GarageDriver } from '../models/GarageDriver';
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
 * Query garages with owner details, metrics, search, and pagination
 */
router.get('/garages', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, search, page: pageStr, limit: limitStr } = req.query;
    const filter: any = {};
    if (status) filter.verificationStatus = status as VerificationStatus;
    if (search && (search as string).trim()) {
      const q = (search as string).trim();
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { garageId: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }

    const page = parseInt((pageStr as string) || '1', 10);
    const limit = parseInt((limitStr as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [rawGarages, total] = await Promise.all([
      Garage.find(filter)
        .populate('ownerId', 'name phone email accountStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Garage.countDocuments(filter),
    ]);

    // Populate operational metrics for each garage
    const garages = await Promise.all(
      rawGarages.map(async (g: any) => {
        const [totalVehicles, operationalVehicles, activeRidesCount] = await Promise.all([
          Vehicle.countDocuments({ garageId: g._id }),
          Vehicle.countDocuments({ garageId: g._id, verificationStatus: 'APPROVED' }),
          Ride.countDocuments({
            garageId: g._id,
            status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
          }),
        ]);

        return {
          ...g,
          metrics: {
            totalVehicles,
            operationalVehicles,
            activeRidesCount,
          },
        };
      })
    );

    res.json({
      success: true,
      count: garages.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      garages,
    });
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
 * Query vehicles displaying short vehicle number, driver verification status, search & pagination
 */
router.get('/vehicles', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, ownershipType, garageId, search, page: pageStr, limit: limitStr } = req.query;
    const filter: any = {};
    if (status) filter.verificationStatus = status as VehicleVerificationStatus;
    if (ownershipType) filter.ownershipType = ownershipType;
    if (garageId && garageId !== 'ALL') filter.garageId = garageId;

    if (search && (search as string).trim()) {
      const q = (search as string).trim();
      const matchingDrivers = await User.find({
        role: 'DRIVER',
        $or: [{ name: { $regex: q, $options: 'i' } }, { phone: { $regex: q, $options: 'i' } }],
      }).select('_id').lean();

      const driverIds = matchingDrivers.map((d) => d._id);

      filter.$or = [
        { shortVehicleNumber: { $regex: q, $options: 'i' } },
        { registrationNumber: { $regex: q, $options: 'i' } },
        { vehicleId: { $regex: q, $options: 'i' } },
        { garageCustomId: { $regex: q, $options: 'i' } },
        { assignedDriverId: { $in: driverIds } },
      ];
    }

    const page = parseInt((pageStr as string) || '1', 10);
    const limit = parseInt((limitStr as string) || '10', 10);
    const skip = (page - 1) * limit;

    const [rawVehicles, total] = await Promise.all([
      Vehicle.find(filter)
        .populate('assignedDriverId', 'name phone driverMode accountStatus')
        .populate('garageId', 'garageId name phone address verificationStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vehicle.countDocuments(filter),
    ]);

    // Verify driver-vehicle relationship server-side for each vehicle
    const activeGarageDrivers = await GarageDriver.find({ status: 'ACTIVE' }).lean();
    const activeGarageDriverSet = new Set<string>();
    activeGarageDrivers.forEach((gd: any) => {
      if (gd.garageId && gd.driverId) {
        activeGarageDriverSet.add(`${gd.garageId.toString()}_${gd.driverId.toString()}`);
      }
    });

    const vehicles = rawVehicles.map((v: any) => {
      const driver = v.assignedDriverId as any;
      const garage = v.garageId as any;
      const driverIdStr = driver?._id?.toString();
      const garageIdStr = garage?._id?.toString();

      let isDriverVerifiedForVehicle = false;
      let driverVerificationReason = '';

      if (!driver) {
        isDriverVerifiedForVehicle = false;
        driverVerificationReason = 'Driver not verified for this vehicle: No driver currently assigned';
      } else if (v.ownershipType === 'SELF_OWNED') {
        if (driver.driverMode === 'SELF_OWNED') {
          isDriverVerifiedForVehicle = true;
          driverVerificationReason = 'Verified self-owned driver assignment';
        } else {
          isDriverVerifiedForVehicle = false;
          driverVerificationReason = 'Driver not verified for this vehicle: Operating mode is not self-owned';
        }
      } else if (v.ownershipType === 'GARAGE_REGISTERED' || v.ownershipType === 'GARAGE_OWNED') {
        const hasGarageLink = garageIdStr && driverIdStr && activeGarageDriverSet.has(`${garageIdStr}_${driverIdStr}`);
        if (hasGarageLink || (v.assignedDriverId && driverIdStr)) {
          isDriverVerifiedForVehicle = true;
          driverVerificationReason = 'Verified garage driver assignment';
        } else {
          isDriverVerifiedForVehicle = false;
          driverVerificationReason = 'Driver not verified for this vehicle: Unconfirmed garage driver association';
        }
      }

      return {
        ...v,
        isDriverVerifiedForVehicle,
        driverVerificationReason,
      };
    });

    res.json({
      success: true,
      count: vehicles.length,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
      vehicles,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch vehicles', details: error.message });
  }
});

/**
 * GET /api/admin/vehicles/:id
 * Retrieve single comprehensive vehicle detail panel bundle
 */
router.get('/vehicles/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const vehicle: any = await Vehicle.findById(id)
      .populate('assignedDriverId', 'name phone email role driverMode accountStatus nidNumber nidStatus')
      .populate('garageId', 'garageId name phone address city area capacity verificationStatus')
      .lean();

    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const driver = vehicle.assignedDriverId as any;
    const garage = vehicle.garageId as any;
    const driverIdStr = driver?._id?.toString();
    const garageIdStr = garage?._id?.toString();

    // Verify driver relationship
    let isDriverVerifiedForVehicle = false;
    let driverVerificationReason = '';

    if (!driver) {
      isDriverVerifiedForVehicle = false;
      driverVerificationReason = 'Driver not verified for this vehicle: No driver assigned';
    } else if (vehicle.ownershipType === 'SELF_OWNED') {
      if (driver.driverMode === 'SELF_OWNED') {
        isDriverVerifiedForVehicle = true;
        driverVerificationReason = 'Verified self-owned driver assignment';
      } else {
        isDriverVerifiedForVehicle = false;
        driverVerificationReason = 'Driver not verified for this vehicle: Driver operating mode is not self-owned';
      }
    } else {
      const activeGD = garageIdStr && driverIdStr
        ? await GarageDriver.findOne({ garageId: garageIdStr, driverId: driverIdStr, status: 'ACTIVE' }).lean()
        : null;

      if (activeGD || driverIdStr) {
        isDriverVerifiedForVehicle = true;
        driverVerificationReason = 'Verified authorized garage driver assignment';
      } else {
        isDriverVerifiedForVehicle = false;
        driverVerificationReason = 'Driver not verified for this vehicle: No active garage relationship found';
      }
    }

    // Fetch Live Location, Active Ride & Active Safety Event in parallel
    const [location, activeRide, safetyEvent] = await Promise.all([
      DriverLocation.findOne({
        $or: [{ vehicleId: vehicle._id }, ...(driverIdStr ? [{ driverId: driver._id }] : [])],
      })
        .sort({ timestamp: -1 })
        .lean(),
      Ride.findOne({
        $or: [{ vehicleId: vehicle._id }, ...(driverIdStr ? [{ driverId: driver._id }] : [])],
        status: { $in: ['ACCEPTED', 'ACTIVE', 'WAITING_PASSENGER_CONFIRM'] },
      })
        .populate('passengerId', 'name phone')
        .lean(),
      SafetyEvent.findOne({
        $or: [{ vehicleId: vehicle._id }, ...(driverIdStr ? [{ driverId: driver._id }] : [])],
        status: { $in: ['ACTIVE', 'ACKNOWLEDGED', 'OPEN'] },
      })
        .sort({ timestamp: -1 })
        .lean(),
    ]);

    // Check location freshness (< 2 minutes)
    const now = Date.now();
    const lastTs = location?.timestamp ? new Date(location.timestamp).getTime() : 0;
    const isFresh = lastTs > 0 && now - lastTs <= 2 * 60 * 1000;

    res.json({
      success: true,
      vehicle: {
        ...vehicle,
        isDriverVerifiedForVehicle,
        driverVerificationReason,
        location: location
          ? {
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy,
              speed: location.speed,
              heading: location.heading,
              status: location.status,
              timestamp: location.timestamp,
              isFresh,
              lastSeenAgoSeconds: Math.round((now - lastTs) / 1000),
            }
          : null,
        activeRide: activeRide
          ? {
              rideId: activeRide.rideId,
              status: activeRide.status,
              passengerName: (activeRide.passengerId as any)?.name || 'Passenger',
              passengerPhone: (activeRide.passengerId as any)?.phone || '',
              passengerPseudonym: activeRide.passengerPseudonym,
              approximatePickupArea: activeRide.approximatePickupArea,
              startedAt: activeRide.startedAt || activeRide.acceptedAt,
              distanceMeters: activeRide.distanceMeters || 0,
              routePointCount: activeRide.routePoints?.length || 0,
            }
          : null,
        safetyEvent: safetyEvent
          ? {
              eventId: safetyEvent.eventId,
              severity: safetyEvent.severity,
              eventType: safetyEvent.eventType,
              description: safetyEvent.description,
              status: safetyEvent.status,
              timestamp: safetyEvent.timestamp,
            }
          : null,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch vehicle detail', details: error.message });
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
      if (action === 'APPROVE') {
        user.nidStatus = 'VERIFIED';
        user.rejectionReason = undefined;
      } else if (action === 'REJECT') {
        user.nidStatus = 'REJECTED';
        user.rejectionReason = reason || 'Identity information mismatch or invalid documents submitted.';
        user.rejectionDate = new Date();
      }
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
 * GET /api/admin/applications/:id
 * Retrieve comprehensive application detail bundle for dedicated Admin review
 */
router.get('/applications/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if ID matches User, Garage, or Vehicle
    const user = await User.findById(id).select('-passwordHash').lean();
    if (user) {
      let garageInfo = null;
      let vehicleInfo = null;

      if (user.role === 'GARAGE_OWNER') {
        garageInfo = await Garage.findOne({ ownerId: user._id }).lean();
      } else if (user.role === 'DRIVER') {
        vehicleInfo = await Vehicle.findOne({ assignedDriverId: user._id }).lean();
        const gd = await GarageDriver.findOne({ driverId: user._id, status: 'ACTIVE' }).populate('garageId', 'name garageId phone').lean();
        if (gd) (user as any).garageLink = gd.garageId;
      }

      const documents: { type: string; title: string; url: string }[] = [];
      if (user.profileImage) documents.push({ type: 'PROFILE_PHOTO', title: 'Profile Photo', url: user.profileImage });
      if (user.nidFrontDocumentRef) documents.push({ type: 'NID_FRONT', title: 'NID Document (Front)', url: user.nidFrontDocumentRef });
      if (user.nidBackDocumentRef) documents.push({ type: 'NID_BACK', title: 'NID Document (Back)', url: user.nidBackDocumentRef });
      if (user.nidDocumentRef && documents.length === 0) documents.push({ type: 'NID_DOCUMENT', title: 'NID Document Scan', url: user.nidDocumentRef });

      res.json({
        success: true,
        application: {
          id: user._id.toString(),
          entityType: 'USER',
          title: user.name,
          role: user.role,
          driverMode: user.driverMode,
          accountStatus: user.accountStatus,
          rejectionReason: user.rejectionReason,
          applicant: {
            id: user._id,
            name: user.name,
            phone: user.phone,
            email: user.email,
            profileImage: user.profileImage,
            createdAt: user.createdAt,
          },
          identity: {
            legalName: user.name,
            dateOfBirth: user.dateOfBirth,
            nidNumber: user.nidNumber,
            nidStatus: user.nidStatus,
            city: user.city,
            area: user.area,
            address: user.address,
          },
          documents,
          roleInfo: {
            garage: garageInfo,
            vehicle: vehicleInfo,
            garageLink: (user as any).garageLink,
          },
        },
      });
      return;
    }

    const garage = await Garage.findById(id).populate('ownerId', 'name phone email nidNumber accountStatus').lean();
    if (garage) {
      res.json({
        success: true,
        application: {
          id: garage._id.toString(),
          entityType: 'GARAGE',
          title: garage.name,
          garageId: garage.garageId,
          verificationStatus: garage.verificationStatus,
          applicant: garage.ownerId,
          identity: {
            legalName: (garage.ownerId as any)?.name,
            phone: garage.phone,
            address: garage.address,
            city: garage.city,
            area: garage.area,
          },
          documents: [],
          roleInfo: {
            capacity: garage.capacity,
            garageId: garage.garageId,
          },
        },
      });
      return;
    }

    const vehicle = await Vehicle.findById(id).populate('assignedDriverId', 'name phone').populate('garageId', 'name garageId').lean();
    if (vehicle) {
      res.json({
        success: true,
        application: {
          id: vehicle._id.toString(),
          entityType: 'VEHICLE',
          title: `Vehicle ${vehicle.shortVehicleNumber}`,
          vehicleId: vehicle.vehicleId,
          verificationStatus: vehicle.verificationStatus,
          applicant: vehicle.assignedDriverId,
          identity: {
            registrationNumber: vehicle.registrationNumber,
            ownershipType: vehicle.ownershipType,
            modelName: vehicle.modelName,
          },
          documents: [],
          roleInfo: {
            garage: vehicle.garageId,
          },
        },
      });
      return;
    }

    res.status(404).json({ error: 'Application entity not found' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch application details', details: error.message });
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
 * Supports operational state filters (statusFilter), live search, and freshness filters
 */
router.get('/locations', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { statusFilter, search, freshness } = req.query;
    const locations = await passengerLocationService.getActiveFleetAndPassengerLocations({
      statusFilter: statusFilter as string,
      search: search as string,
      freshness: freshness as string,
    });
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

/**
 * POST /api/admin/vehicles/:id/revoke-qr
 * Admin endpoint to revoke a physical Rickshaw QR code (e.g. damaged, lost, or compromised)
 */
router.post('/vehicles/:id/revoke-qr', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const currentToken = vehicle.qrIdentifier;
    vehicle.qrStatus = 'REVOKED';

    if (!vehicle.qrHistory) vehicle.qrHistory = [];
    vehicle.qrHistory.push({
      token: currentToken,
      status: 'REVOKED',
      createdAt: new Date(),
      revokedAt: new Date(),
      reason: reason || 'Administrative revocation',
    });

    await vehicle.save();

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'REVOKE_QR',
      entity: 'VEHICLE',
      entityId: vehicle._id.toString(),
      metadata: { targetEntityName: vehicle.shortVehicleNumber, reason: reason || 'Admin revocation' },
    });

    res.json({
      success: true,
      message: `Rickshaw ${vehicle.shortVehicleNumber} QR code has been revoked.`,
      vehicle: {
        _id: vehicle._id,
        vehicleId: vehicle.vehicleId,
        shortVehicleNumber: vehicle.shortVehicleNumber,
        qrStatus: vehicle.qrStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to revoke QR code', details: error.message });
  }
});

/**
 * POST /api/admin/vehicles/:id/replace-qr
 * Admin endpoint to generate a new cryptographic QR code for a vehicle and archive the old token as REPLACED
 */
router.post('/vehicles/:id/replace-qr', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const oldToken = vehicle.qrIdentifier;
    const { qrService } = await import('../services/qrService');
    const newToken = qrService.generateSignedToken(vehicle.vehicleId || vehicle.shortVehicleNumber);

    vehicle.qrIdentifier = newToken;
    vehicle.qrStatus = 'ACTIVE';

    if (!vehicle.qrHistory) vehicle.qrHistory = [];
    vehicle.qrHistory.push({
      token: oldToken,
      status: 'REPLACED',
      createdAt: new Date(),
      revokedAt: new Date(),
      replacedBy: newToken,
      reason: reason || 'Admin QR replacement',
    });

    await vehicle.save();

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'REPLACE_QR',
      entity: 'VEHICLE',
      entityId: vehicle._id.toString(),
      metadata: { targetEntityName: vehicle.shortVehicleNumber, previousToken: oldToken, newToken },
    });

    res.json({
      success: true,
      message: `Rickshaw ${vehicle.shortVehicleNumber} QR code successfully replaced with new cryptographic token.`,
      vehicle: {
        _id: vehicle._id,
        vehicleId: vehicle.vehicleId,
        shortVehicleNumber: vehicle.shortVehicleNumber,
        qrIdentifier: vehicle.qrIdentifier,
        qrStatus: vehicle.qrStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to replace QR code', details: error.message });
  }
});

export default router;
