import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { GarageDriver } from '../models/GarageDriver';
import { VehicleDriver } from '../models/VehicleDriver';
import { Vehicle } from '../models/Vehicle';
import { auditService } from '../services/auditService';
import { qrService } from '../services/qrService';

const router = Router();

// Protect ALL driver endpoints: Require valid JWT token AND DRIVER role
router.use(requireAuth);
router.use(requireRole('DRIVER'));

/**
 * GET /api/driver/me
 * Consolidated endpoint returning driver identity, operating mode, Admin account status,
 * garage relationship (for Garage Driver), and vehicle relationship.
 */
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const driverDoc = await User.findById(req.user!.id).select('-passwordHash').lean();
    if (!driverDoc) {
      res.status(404).json({ error: 'Driver profile not found.' });
      return;
    }

    const driverMode = driverDoc.driverMode || 'GARAGE_REGISTERED';
    let garageRelation = null;
    let vehicle = null;

    if (driverMode === 'GARAGE_REGISTERED') {
      // Fetch active or pending garage relationship
      const relDoc = await GarageDriver.findOne({
        driverId: req.user!.id,
        status: { $ne: 'TERMINATED' },
      })
        .populate('garageId', 'name address phone verificationStatus capacity')
        .sort({ createdAt: -1 })
        .lean();

      if (relDoc) {
        const garageObj: any = relDoc.garageId;
        garageRelation = {
          relationId: (relDoc._id as object).toString(),
          garageId: garageObj?._id ? (garageObj._id as object).toString() : null,
          garageName: garageObj?.name || 'Unknown Garage',
          garagePhone: garageObj?.phone || '',
          garageAddress: garageObj?.address || '',
          garageVerificationStatus: garageObj?.verificationStatus || 'PENDING',
          garageConfirmationStatus: relDoc.status, // 'PENDING' | 'ACTIVE' | 'INACTIVE'
          assignedAt: relDoc.assignedAt,
        };
      }

      // Fetch assigned vehicle for this driver
      vehicle = await Vehicle.findOne({ assignedDriverId: req.user!.id })
        .populate('garageId', 'name phone')
        .select('shortVehicleNumber registrationNumber verificationStatus status modelName manufacturingYear qrIdentifier ownershipType')
        .lean();
    } else {
      // SELF_OWNED Driver: Fetch self-owned vehicle
      vehicle = await Vehicle.findOne({
        assignedDriverId: req.user!.id,
        ownershipType: 'SELF_OWNED',
      })
        .select('shortVehicleNumber registrationNumber verificationStatus status modelName manufacturingYear qrIdentifier ownershipType')
        .lean();
    }

    res.json({
      success: true,
      driver: {
        id: (driverDoc._id as object).toString(),
        name: driverDoc.name,
        phone: driverDoc.phone,
        email: driverDoc.email,
        role: driverDoc.role,
        driverMode: driverDoc.driverMode,
        accountStatus: driverDoc.accountStatus, // Admin Platform Status: PENDING | ACTIVE | REJECTED | SUSPENDED
        createdAt: driverDoc.createdAt,
      },
      garageRelation,
      vehicle: vehicle
        ? {
            id: (vehicle._id as object).toString(),
            shortVehicleNumber: vehicle.shortVehicleNumber,
            registrationNumber: vehicle.registrationNumber,
            verificationStatus: vehicle.verificationStatus, // Admin Vehicle Approval: PENDING | APPROVED | REJECTED | SUSPENDED
            status: vehicle.status, // Operational Status: AVAILABLE | ON_RIDE | OFFLINE
            modelName: vehicle.modelName,
            manufacturingYear: vehicle.manufacturingYear,
            ownershipType: vehicle.ownershipType,
            qrIdentifier: vehicle.qrIdentifier,
            garageName: (vehicle as any).garageId?.name,
          }
        : null,
      operationalState: 'OFFLINE', // Hardware-independent neutral state placeholder
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver profile', details: error.message });
  }
});

/**
 * GET /api/driver/vehicle
 * Fetch detailed vehicle information for authenticated driver
 */
router.get('/vehicle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const driverDoc = await User.findById(req.user!.id);
    if (!driverDoc) {
      res.status(404).json({ error: 'Driver account not found.' });
      return;
    }

    const filter: any = { assignedDriverId: req.user!.id };
    if (driverDoc.driverMode === 'SELF_OWNED') {
      filter.ownershipType = 'SELF_OWNED';
    }

    const vehicle = await Vehicle.findOne(filter)
      .populate('garageId', 'name address phone')
      .lean();

    res.json({
      success: true,
      hasVehicle: !!vehicle,
      vehicle: vehicle || null,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver vehicle', details: error.message });
  }
});

/**
 * GET /api/driver/garage
 * Retrieve garage associations log for Garage-Registered drivers
 */
router.get('/garage', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const driverDoc = await User.findById(req.user!.id);
    if (!driverDoc) {
      res.status(404).json({ error: 'Driver account not found.' });
      return;
    }

    if (driverDoc.driverMode === 'SELF_OWNED') {
      res.json({
        success: true,
        isSelfOwned: true,
        message: 'Self-Owned Drivers operate independently and do not belong to a garage.',
        associations: [],
      });
      return;
    }

    const associations = await GarageDriver.find({ driverId: req.user!.id })
      .populate('garageId', 'name address phone verificationStatus capacity')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      isSelfOwned: false,
      count: associations.length,
      associations,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch garage associations', details: error.message });
  }
});

/**
 * GET /api/driver/history
 * Fetch driver's vehicle assignment history log and summary foundation
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const vehicleHistory = await VehicleDriver.find({ driverId: req.user!.id })
      .populate('vehicleId', 'shortVehicleNumber registrationNumber ownershipType modelName')
      .sort({ assignedAt: -1 })
      .lean();

    res.json({
      success: true,
      assignmentHistoryCount: vehicleHistory.length,
      assignmentHistory: vehicleHistory,
      ridesCount: 0, // Placeholder foundation for future ride history
      ratingsCount: 0, // Placeholder foundation for future ratings
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver history log', details: error.message });
  }
});

/**
 * POST /api/driver/self-owned-vehicle
 * Allow a Self-Owned Driver to register or update their self-owned rickshaw profile
 */
router.post('/self-owned-vehicle', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const driverDoc = await User.findById(req.user!.id);
    if (!driverDoc || driverDoc.role !== 'DRIVER') {
      res.status(403).json({ error: 'Driver authorization required.' });
      return;
    }

    if (driverDoc.driverMode !== 'SELF_OWNED') {
      res.status(403).json({
        error: 'Forbidden: Only Self-Owned Drivers can register self-owned vehicles. Garage Drivers receive vehicles from their Garage Owner.',
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

    // Check duplicate short vehicle number (excluding existing vehicle belonging to this driver)
    const existingShort = await Vehicle.findOne({
      shortVehicleNumber: cleanShortNum,
      assignedDriverId: { $ne: req.user!.id },
    });
    if (existingShort) {
      res.status(400).json({ error: `Short vehicle number [${cleanShortNum}] is already registered.` });
      return;
    }

    // Check duplicate registration number
    const existingReg = await Vehicle.findOne({
      registrationNumber: cleanRegNum,
      assignedDriverId: { $ne: req.user!.id },
    });
    if (existingReg) {
      res.status(400).json({ error: `Registration number [${cleanRegNum}] is already registered.` });
      return;
    }

    const qrIdentifier = qrService.generateSignedToken(cleanShortNum);

    // Upsert driver's self-owned vehicle
    let vehicle = await Vehicle.findOne({
      assignedDriverId: req.user!.id,
      ownershipType: 'SELF_OWNED',
    });

    if (vehicle) {
      vehicle.shortVehicleNumber = cleanShortNum;
      vehicle.registrationNumber = cleanRegNum;
      vehicle.qrIdentifier = qrIdentifier;
      vehicle.modelName = modelName ? modelName.trim() : vehicle.modelName;
      vehicle.manufacturingYear = manufacturingYear ? Number(manufacturingYear) : vehicle.manufacturingYear;
      vehicle.verificationStatus = 'PENDING'; // Resubmits for Admin vehicle approval
      await vehicle.save();
    } else {
      vehicle = await Vehicle.create({
        shortVehicleNumber: cleanShortNum,
        registrationNumber: cleanRegNum,
        qrIdentifier,
        ownershipType: 'SELF_OWNED',
        assignedDriverId: req.user!.id,
        verificationStatus: 'PENDING', // Requires Admin vehicle approval
        status: 'OFFLINE',
        modelName: modelName ? modelName.trim() : 'Personal Electric Rickshaw',
        manufacturingYear: manufacturingYear ? Number(manufacturingYear) : new Date().getFullYear(),
        location: {
          type: 'Point',
          coordinates: [90.4125, 23.8103],
        },
      });

      // Create current VehicleDriver tracking record
      await VehicleDriver.create({
        vehicleId: vehicle._id,
        driverId: req.user!.id,
        assignedAt: new Date(),
        isCurrent: true,
      });
    }

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'SELF_OWNED_VEHICLE_REGISTER',
      entity: 'Vehicle',
      entityId: (vehicle._id as object).toString(),
      ipAddress: req.ip,
      metadata: {
        shortVehicleNumber: vehicle.shortVehicleNumber,
        registrationNumber: vehicle.registrationNumber,
        driverId: req.user!.id,
      },
    });

    res.status(200).json({
      success: true,
      message: `Self-Owned Rickshaw ${cleanShortNum} registered successfully and submitted for Admin approval.`,
      vehicle,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register self-owned vehicle', details: error.message });
  }
});

export default router;
