import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Garage } from '../models/Garage';
import { Vehicle } from '../models/Vehicle';
import { GarageDriver } from '../models/GarageDriver';
import { VehicleDriver } from '../models/VehicleDriver';
import { auditService } from '../services/auditService';
import { qrService } from '../services/qrService';

const router = Router();

// Require JWT authentication and GARAGE_OWNER role for all endpoints in this router
router.use(requireAuth);
router.use(requireRole('GARAGE_OWNER'));

/**
 * Helper to fetch authenticated user's garage doc
 */
async function getOwnerGarage(ownerId: string) {
  return await Garage.findOne({ ownerId });
}

/**
 * GET /api/garage/my-garage
 * Retrieve authenticated Garage Owner's garage record
 */
router.get('/my-garage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.json({
        success: true,
        hasGarage: false,
        garage: null,
        message: 'No registered garage found for this account.',
      });
      return;
    }

    res.json({
      success: true,
      hasGarage: true,
      garage,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch garage profile', details: error.message });
  }
});

/**
 * POST /api/garage/create
 * Create a new garage profile for the authenticated Garage Owner
 */
router.post('/create', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const existingGarage = await getOwnerGarage(req.user!.id);
    if (existingGarage) {
      res.status(400).json({ error: 'Account already owns a registered garage profile.' });
      return;
    }

    const { name, address, phone, capacity } = req.body;

    if (!name || !address || !phone) {
      res.status(400).json({ error: 'Name, address, and contact phone are required.' });
      return;
    }

    const newGarage = await Garage.create({
      ownerId: req.user!.id,
      name: name.trim(),
      address: address.trim(),
      phone: phone.trim(),
      capacity: Number(capacity) || 10,
      verificationStatus: 'PENDING', // Default state requiring Admin approval
    });

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_CREATE',
      entity: 'GARAGE',
      entityId: (newGarage._id as object).toString(),
      ipAddress: req.ip,
      metadata: { name: newGarage.name, verificationStatus: newGarage.verificationStatus },
    });

    res.status(201).json({
      success: true,
      message: 'Garage profile created successfully and submitted for Admin approval.',
      garage: newGarage,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create garage profile', details: error.message });
  }
});

/**
 * PUT /api/garage/profile
 * Update existing garage details (cannot update verificationStatus)
 */
router.put('/profile', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(404).json({ error: 'No garage profile found for this account.' });
      return;
    }

    const { name, address, phone, capacity } = req.body;

    if (name) garage.name = name.trim();
    if (address) garage.address = address.trim();
    if (phone) garage.phone = phone.trim();
    if (capacity !== undefined) garage.capacity = Number(capacity);

    await garage.save();

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_PROFILE_UPDATE',
      entity: 'GARAGE',
      entityId: (garage._id as object).toString(),
      ipAddress: req.ip,
      metadata: { name: garage.name, phone: garage.phone, capacity: garage.capacity },
    });

    res.json({
      success: true,
      message: 'Garage profile updated successfully.',
      garage,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update garage profile', details: error.message });
  }
});

/**
 * GET /api/garage/dashboard-stats
 * Returns real MongoDB operational metrics for the Garage Owner
 */
router.get('/dashboard-stats', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.json({
        success: true,
        hasGarage: false,
        stats: {
          totalRickshaws: 0,
          activeRickshaws: 0,
          availableRickshaws: 0,
          assignedDrivers: 0,
          unassignedRickshaws: 0,
          pendingDriverConfirmations: 0,
          pendingVehicleApprovals: 0,
        },
      });
      return;
    }

    const garageId = garage._id;

    const [
      totalRickshaws,
      activeRickshaws,
      availableRickshaws,
      assignedDrivers,
      unassignedRickshaws,
      pendingDriverConfirmations,
      pendingVehicleApprovals,
    ] = await Promise.all([
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED' }),
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED', status: { $in: ['AVAILABLE', 'ON_RIDE'] } }),
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED', status: 'AVAILABLE' }),
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED', assignedDriverId: { $ne: null } }),
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED', assignedDriverId: null }),
      GarageDriver.countDocuments({ garageId, status: 'PENDING' }),
      Vehicle.countDocuments({ garageId, ownershipType: 'GARAGE_REGISTERED', verificationStatus: 'PENDING' }),
    ]);

    res.json({
      success: true,
      hasGarage: true,
      garageStatus: garage.verificationStatus,
      garageName: garage.name,
      stats: {
        totalRickshaws,
        activeRickshaws,
        availableRickshaws,
        assignedDrivers,
        unassignedRickshaws,
        pendingDriverConfirmations,
        pendingVehicleApprovals,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to aggregate garage stats', details: error.message });
  }
});

/**
 * GET /api/garage/vehicles
 * Query garage-owned rickshaws with search by short number / reg number
 */
router.get('/vehicles', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.json({ success: true, count: 0, vehicles: [] });
      return;
    }

    const { status, verificationStatus, search } = req.query;
    const filter: any = { garageId: garage._id, ownershipType: 'GARAGE_REGISTERED' };

    if (status) filter.status = status;
    if (verificationStatus) filter.verificationStatus = verificationStatus;

    if (search) {
      filter.$or = [
        { shortVehicleNumber: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { modelName: { $regex: search, $options: 'i' } },
      ];
    }

    const vehicles = await Vehicle.find(filter)
      .populate('assignedDriverId', 'name phone driverMode accountStatus')
      .populate('garageId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch garage vehicles', details: error.message });
  }
});

/**
 * POST /api/garage/vehicles
 * Register a new vehicle under the authenticated garage
 */
router.post('/vehicles', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'You must have a registered garage profile before adding vehicles.' });
      return;
    }

    if (garage.verificationStatus !== 'APPROVED') {
      res.status(403).json({
        error: `Garage is currently [${garage.verificationStatus}]. Admin approval is required before registering vehicles.`,
      });
      return;
    }

    const { shortVehicleNumber, registrationNumber, modelName, manufacturingYear } = req.body;

    if (!shortVehicleNumber || !registrationNumber) {
      res.status(400).json({ error: 'Short vehicle number and registration number are required.' });
      return;
    }

    const cleanShortNum = shortVehicleNumber.trim().toUpperCase();
    const cleanRegNum = registrationNumber.trim().toUpperCase();

    // Check duplicate short vehicle number
    const existingShort = await Vehicle.findOne({ shortVehicleNumber: cleanShortNum });
    if (existingShort) {
      res.status(400).json({ error: `Short vehicle number [${cleanShortNum}] is already registered.` });
      return;
    }

    // Check duplicate registration number
    const existingReg = await Vehicle.findOne({ registrationNumber: cleanRegNum });
    if (existingReg) {
      res.status(400).json({ error: `Registration number [${cleanRegNum}] is already registered.` });
      return;
    }

    const qrIdentifier = qrService.generateSignedToken(cleanShortNum);

    const vehicle = await Vehicle.create({
      shortVehicleNumber: cleanShortNum,
      registrationNumber: cleanRegNum,
      qrIdentifier,
      ownershipType: 'GARAGE_REGISTERED',
      garageId: garage._id,
      verificationStatus: 'PENDING', // Requires Admin vehicle approval
      status: 'OFFLINE',
      modelName: modelName ? modelName.trim() : 'Standard Electric Rickshaw',
      manufacturingYear: manufacturingYear ? Number(manufacturingYear) : new Date().getFullYear(),
      location: {
        type: 'Point',
        coordinates: [90.4125, 23.8103],
      },
    });

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_VEHICLE_REGISTER',
      entity: 'VEHICLE',
      entityId: (vehicle._id as object).toString(),
      ipAddress: req.ip,
      metadata: {
        shortVehicleNumber: vehicle.shortVehicleNumber,
        registrationNumber: vehicle.registrationNumber,
        garageId: garage._id.toString(),
      },
    });

    res.status(201).json({
      success: true,
      message: `Vehicle ${cleanShortNum} registered successfully and submitted for Admin approval.`,
      vehicle,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register vehicle', details: error.message });
  }
});

/**
 * GET /api/garage/drivers
 * Retrieve drivers associated with this garage
 */
router.get('/drivers', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.json({ success: true, count: 0, drivers: [] });
      return;
    }

    const { status, search } = req.query;
    const filter: any = { garageId: garage._id };
    if (status) filter.status = status;

    const garageDrivers = await GarageDriver.find(filter)
      .populate('driverId', 'name phone email accountStatus driverMode createdAt')
      .sort({ createdAt: -1 })
      .lean();

    // Map and enrich drivers with search filtering and current assigned vehicle
    const enrichedDrivers = [];

    for (const gd of garageDrivers as any[]) {
      const driver = gd.driverId;
      if (!driver) continue;

      // Search filter check
      if (search) {
        const query = search.toString().toLowerCase();
        const nameMatch = driver.name?.toLowerCase().includes(query);
        const phoneMatch = driver.phone?.toLowerCase().includes(query);
        if (!nameMatch && !phoneMatch) continue;
      }

      // Check current assigned vehicle in this garage
      const assignedVehicle = await Vehicle.findOne({
        garageId: garage._id,
        assignedDriverId: driver._id,
      })
        .select('shortVehicleNumber registrationNumber status verificationStatus')
        .lean();

      enrichedDrivers.push({
        relationId: gd._id.toString(),
        driverId: driver._id.toString(),
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        driverMode: driver.driverMode,
        adminAccountStatus: driver.accountStatus,
        garageConfirmationStatus: gd.status,
        assignedAt: gd.assignedAt,
        terminatedAt: gd.terminatedAt,
        assignedVehicle: assignedVehicle
          ? {
              id: (assignedVehicle._id as object).toString(),
              shortVehicleNumber: assignedVehicle.shortVehicleNumber,
              registrationNumber: assignedVehicle.registrationNumber,
              status: assignedVehicle.status,
              verificationStatus: assignedVehicle.verificationStatus,
            }
          : null,
      });
    }

    res.json({ success: true, count: enrichedDrivers.length, drivers: enrichedDrivers });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch garage drivers', details: error.message });
  }
});

/**
 * POST /api/garage/drivers/confirm
 * Garage Owner confirms or rejects a driver association
 */
router.post('/drivers/confirm', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'No garage profile found for this account.' });
      return;
    }

    if (garage.verificationStatus !== 'APPROVED') {
      res.status(403).json({
        error: `Garage status is [${garage.verificationStatus}]. Admin approval is required before confirming drivers.`,
      });
      return;
    }

    const { driverId, action } = req.body; // action: 'CONFIRM' | 'REJECT'

    if (!driverId || !action || !['CONFIRM', 'REJECT'].includes(action)) {
      res.status(400).json({ error: 'driverId and valid action (CONFIRM or REJECT) are required.' });
      return;
    }

    const driverUser = await User.findById(driverId);
    if (!driverUser || driverUser.role !== 'DRIVER' || driverUser.driverMode !== 'GARAGE_REGISTERED') {
      res.status(400).json({ error: 'Target user is not a valid Garage-Registered Driver.' });
      return;
    }

    let relation = await GarageDriver.findOne({ garageId: garage._id, driverId });
    if (!relation) {
      // Create relation doc if driver initiated request or garage owner added driver ID
      relation = new GarageDriver({
        garageId: garage._id,
        driverId,
        status: 'PENDING',
      });
    }

    const previousStatus = relation.status;
    const newStatus = action === 'CONFIRM' ? 'ACTIVE' : 'TERMINATED';

    relation.status = newStatus;
    if (newStatus === 'ACTIVE') {
      relation.assignedAt = new Date();
      relation.terminatedAt = undefined;
    } else {
      relation.terminatedAt = new Date();

      // If rejected/terminated, unassign driver from any vehicle in this garage
      const assignedVeh = await Vehicle.findOne({ garageId: garage._id, assignedDriverId: driverId });
      if (assignedVeh) {
        assignedVeh.assignedDriverId = undefined;
        await assignedVeh.save();

        await VehicleDriver.updateMany(
          { vehicleId: assignedVeh._id, driverId, isCurrent: true },
          { isCurrent: false, unassignedAt: new Date() }
        );
      }
    }

    await relation.save();

    // Audit log entry
    await auditService.logAction({
      actorId: req.user!.id,
      action: `GARAGE_DRIVER_${action}`,
      entity: 'GarageDriver',
      entityId: (relation._id as object).toString(),
      ipAddress: req.ip,
      metadata: {
        garageId: garage._id.toString(),
        driverId: driverUser._id.toString(),
        driverName: driverUser.name,
        previousStatus,
        newStatus,
      },
    });

    res.json({
      success: true,
      message: `Driver ${driverUser.name} status updated to ${newStatus}.`,
      driverId,
      status: newStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process driver confirmation', details: error.message });
  }
});

/**
 * POST /api/garage/assign-vehicle
 * Assign a confirmed Garage Driver to a Garage-owned rickshaw
 */
router.post('/assign-vehicle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'No garage profile found for this account.' });
      return;
    }

    // Rule 1 & 2: Garage exists and is APPROVED
    if (garage.verificationStatus !== 'APPROVED') {
      res.status(403).json({ error: `Garage is [${garage.verificationStatus}]. Must be APPROVED to assign drivers.` });
      return;
    }

    const { vehicleId, driverId } = req.body;

    if (!vehicleId || !driverId) {
      res.status(400).json({ error: 'vehicleId and driverId are required.' });
      return;
    }

    // Rule 7 & 8 & 9: Vehicle exists, belongs to this garage, is GARAGE_REGISTERED and APPROVED
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      res.status(404).json({ error: 'Target vehicle not found.' });
      return;
    }

    if (!vehicle.garageId || vehicle.garageId.toString() !== garage._id.toString()) {
      res.status(403).json({ error: 'Forbidden: Target vehicle does not belong to your garage.' });
      return;
    }

    if (vehicle.ownershipType !== 'GARAGE_REGISTERED') {
      res.status(400).json({ error: 'Cannot assign drivers to Self-Owned vehicles.' });
      return;
    }

    if (vehicle.verificationStatus !== 'APPROVED') {
      res.status(400).json({
        error: `Vehicle [${vehicle.shortVehicleNumber}] status is [${vehicle.verificationStatus}]. Requires Admin approval before assignment.`,
      });
      return;
    }

    // Rule 3 & 4 & 5: Driver exists, is GARAGE_DRIVER, and accountStatus is ACTIVE
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'DRIVER') {
      res.status(404).json({ error: 'Target driver not found.' });
      return;
    }

    if (driver.driverMode !== 'GARAGE_REGISTERED') {
      res.status(400).json({ error: 'Self-Owned drivers cannot be assigned to Garage-owned rickshaws.' });
      return;
    }

    if (driver.accountStatus !== 'ACTIVE') {
      res.status(400).json({ error: `Driver account is [${driver.accountStatus}]. Requires ACTIVE Admin platform status.` });
      return;
    }

    // Rule 6: Driver belongs to and is confirmed (ACTIVE) for this garage
    const garageRelation = await GarageDriver.findOne({ garageId: garage._id, driverId, status: 'ACTIVE' });
    if (!garageRelation) {
      res.status(400).json({ error: 'Driver is not an active confirmed driver for this garage.' });
      return;
    }

    // Rule 10: Manage existing active assignments safely
    // A) If vehicle has a previous assigned driver, unassign them
    if (vehicle.assignedDriverId && vehicle.assignedDriverId.toString() !== driverId) {
      await VehicleDriver.updateMany(
        { vehicleId: vehicle._id, isCurrent: true },
        { isCurrent: false, unassignedAt: new Date() }
      );
    }

    // B) If target driver is assigned to another vehicle in any garage, unassign them first
    const previousVehicles = await Vehicle.find({ assignedDriverId: driverId });
    for (const prevVeh of previousVehicles) {
      prevVeh.assignedDriverId = undefined;
      await prevVeh.save();

      await VehicleDriver.updateMany(
        { vehicleId: prevVeh._id, driverId, isCurrent: true },
        { isCurrent: false, unassignedAt: new Date() }
      );
    }

    // Set new assignment
    vehicle.assignedDriverId = driver._id as any;
    if (vehicle.status === 'OFFLINE') {
      vehicle.status = 'AVAILABLE';
    }
    await vehicle.save();

    // Create current VehicleDriver record
    await VehicleDriver.create({
      vehicleId: vehicle._id,
      driverId: driver._id,
      assignedAt: new Date(),
      isCurrent: true,
    });

    // Audit log
    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_VEHICLE_ASSIGN',
      entity: 'Vehicle',
      entityId: vehicle._id.toString(),
      ipAddress: req.ip,
      metadata: {
        shortVehicleNumber: vehicle.shortVehicleNumber,
        driverId: driver._id.toString(),
        driverName: driver.name,
      },
    });

    res.json({
      success: true,
      message: `Driver ${driver.name} assigned to vehicle ${vehicle.shortVehicleNumber} successfully.`,
      vehicleId: vehicle._id,
      driverId: driver._id,
      shortVehicleNumber: vehicle.shortVehicleNumber,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to assign vehicle', details: error.message });
  }
});

/**
 * POST /api/garage/unassign-vehicle
 * Unlink a driver from a Garage-owned rickshaw while preserving historical log
 */
router.post('/unassign-vehicle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'No garage profile found for this account.' });
      return;
    }

    const { vehicleId } = req.body;
    if (!vehicleId) {
      res.status(400).json({ error: 'vehicleId is required.' });
      return;
    }

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle || !vehicle.garageId || vehicle.garageId.toString() !== garage._id.toString()) {
      res.status(403).json({ error: 'Vehicle not found or does not belong to your garage.' });
      return;
    }

    if (!vehicle.assignedDriverId) {
      res.status(400).json({ error: 'Vehicle has no assigned driver.' });
      return;
    }

    const prevDriverId = vehicle.assignedDriverId;

    // Update historical VehicleDriver record
    await VehicleDriver.updateMany(
      { vehicleId: vehicle._id, isCurrent: true },
      { isCurrent: false, unassignedAt: new Date() }
    );

    vehicle.assignedDriverId = undefined;
    await vehicle.save();

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_VEHICLE_UNASSIGN',
      entity: 'Vehicle',
      entityId: vehicle._id.toString(),
      ipAddress: req.ip,
      metadata: {
        shortVehicleNumber: vehicle.shortVehicleNumber,
        previousDriverId: prevDriverId.toString(),
      },
    });

    res.json({
      success: true,
      message: `Driver unlinked from vehicle ${vehicle.shortVehicleNumber}. Historical record preserved.`,
      vehicleId: vehicle._id,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to unassign vehicle', details: error.message });
  }
});

/**
 * POST /api/garage/terminate-driver
 * Terminate driver relationship with garage
 */
router.post('/terminate-driver', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'No garage profile found for this account.' });
      return;
    }

    const { driverId } = req.body;
    if (!driverId) {
      res.status(400).json({ error: 'driverId is required.' });
      return;
    }

    // Unassign driver from any vehicle in this garage
    const assignedVeh = await Vehicle.findOne({ garageId: garage._id, assignedDriverId: driverId });
    if (assignedVeh) {
      assignedVeh.assignedDriverId = undefined;
      await assignedVeh.save();

      await VehicleDriver.updateMany(
        { vehicleId: assignedVeh._id, driverId, isCurrent: true },
        { isCurrent: false, unassignedAt: new Date() }
      );
    }

    const relation = await GarageDriver.findOne({ garageId: garage._id, driverId });
    if (relation) {
      relation.status = 'TERMINATED';
      relation.terminatedAt = new Date();
      await relation.save();
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'GARAGE_DRIVER_TERMINATE',
      entity: 'GarageDriver',
      entityId: relation ? (relation._id as object).toString() : driverId,
      ipAddress: req.ip,
      metadata: { garageId: garage._id.toString(), driverId },
    });

    res.json({
      success: true,
      message: 'Driver association terminated successfully.',
      driverId,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to terminate driver', details: error.message });
  }
});

/**
 * GET /api/garage/driver-history/:driverId
 * Retrieve historical assignment log for a driver
 */
router.get('/driver-history/:driverId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const garage = await getOwnerGarage(req.user!.id);
    if (!garage) {
      res.status(400).json({ error: 'No garage profile found.' });
      return;
    }

    const { driverId } = req.params;

    const history = await VehicleDriver.find({ driverId })
      .populate('vehicleId', 'shortVehicleNumber registrationNumber modelName')
      .sort({ assignedAt: -1 })
      .lean();

    res.json({
      success: true,
      driverId,
      history,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver assignment history', details: error.message });
  }
});

export default router;
