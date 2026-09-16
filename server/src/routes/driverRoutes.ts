import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { User } from '../models/User';
import { GarageDriver } from '../models/GarageDriver';
import { VehicleDriver } from '../models/VehicleDriver';
import { Vehicle } from '../models/Vehicle';
import { auditService } from '../services/auditService';
import { qrService } from '../services/qrService';
import { generateSelfOwnedVehicleId } from '../services/idGeneratorService';

const router = Router();

// Protect ALL driver endpoints: Require valid JWT token AND DRIVER role
router.use(requireAuth);
router.use(requireRole('DRIVER'));

/**
 * GET /api/driver/me
 * Consolidated endpoint returning driver identity, NID status, operating mode, Admin account status,
 * garage relationship (for Garage Driver), and vehicle relationship with structured vehicleId.
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
        .populate('garageId', 'garageId name address phone verificationStatus capacity city area')
        .sort({ createdAt: -1 })
        .lean();

      if (relDoc) {
        const garageObj: any = relDoc.garageId;
        garageRelation = {
          relationId: (relDoc._id as object).toString(),
          garageId: garageObj?._id ? (garageObj._id as object).toString() : null,
          garageCustomId: garageObj?.garageId || 'DH-GAR-0001',
          garageName: garageObj?.name || 'Unknown Garage',
          garagePhone: garageObj?.phone || '',
          garageAddress: garageObj?.address || '',
          garageCity: garageObj?.city || 'Dhaka',
          garageArea: garageObj?.area || '',
          garageVerificationStatus: garageObj?.verificationStatus || 'PENDING',
          garageConfirmationStatus: relDoc.status, // 'PENDING' | 'ACTIVE' | 'INACTIVE'
          assignedAt: relDoc.assignedAt,
        };
      }

      // Fetch assigned vehicle for this driver
      vehicle = await Vehicle.findOne({ assignedDriverId: req.user!.id })
        .populate('garageId', 'garageId name phone')
        .select('vehicleId garageCustomId shortVehicleNumber registrationNumber verificationStatus status modelName manufacturingYear qrIdentifier ownershipType city area')
        .lean();
    } else {
      // SELF_OWNED Driver: Fetch self-owned vehicle
      vehicle = await Vehicle.findOne({
        assignedDriverId: req.user!.id,
        ownershipType: 'SELF_OWNED',
      })
        .select('vehicleId garageCustomId shortVehicleNumber registrationNumber verificationStatus status modelName manufacturingYear qrIdentifier ownershipType city area')
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
        nidNumber: driverDoc.nidNumber || null,
        nidStatus: driverDoc.nidStatus || 'PENDING',
        nidDocumentRef: driverDoc.nidDocumentRef || null,
        city: driverDoc.city || 'Dhaka',
        area: driverDoc.area || '',
        address: driverDoc.address || '',
        isIdentityProtected: driverDoc.isIdentityProtected ?? true,
        createdAt: driverDoc.createdAt,
      },
      garageRelation,
      vehicle: vehicle
        ? {
            id: (vehicle._id as object).toString(),
            vehicleId: (vehicle as any).vehicleId || (vehicle as any).shortVehicleNumber,
            garageCustomId: (vehicle as any).garageCustomId || null,
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
 * POST /api/driver/nid
 * Submit or update driver NID identity number and document photo reference
 */
router.post('/nid', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const driverDoc = await User.findById(req.user!.id);
    if (!driverDoc || driverDoc.role !== 'DRIVER') {
      res.status(403).json({ error: 'Driver authorization required.' });
      return;
    }

    const { nidNumber, nidDocumentRef, city, area, address } = req.body;

    if (!nidNumber) {
      res.status(400).json({ error: 'NID number is mandatory for driver identity.' });
      return;
    }

    const cleanNid = nidNumber.trim();

    // Check NID Uniqueness across all users
    const existingUser = await User.findOne({
      nidNumber: cleanNid,
      _id: { $ne: driverDoc._id },
    });
    if (existingUser) {
      res.status(400).json({ error: `NID number [${cleanNid}] is already registered under another account.` });
      return;
    }

    driverDoc.nidNumber = cleanNid;
    driverDoc.nidStatus = 'PENDING'; // Resubmits for Admin NID verification
    if (nidDocumentRef) driverDoc.nidDocumentRef = nidDocumentRef.trim();
    if (city) driverDoc.city = city.trim();
    if (area) driverDoc.area = area.trim();
    if (address) driverDoc.address = address.trim();
    driverDoc.isIdentityProtected = true;

    await driverDoc.save();

    await auditService.logAction({
      actorId: req.user!.id,
      action: 'DRIVER_NID_SUBMIT',
      entity: 'User',
      entityId: (driverDoc._id as object).toString(),
      ipAddress: req.ip,
      metadata: { nidNumber: cleanNid, nidStatus: driverDoc.nidStatus },
    });

    res.json({
      success: true,
      message: 'NID identity submitted successfully and queued for Admin verification.',
      nidNumber: driverDoc.nidNumber,
      nidStatus: driverDoc.nidStatus,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to submit NID details', details: error.message });
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
      .populate('garageId', 'garageId name address phone')
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
      .populate('garageId', 'garageId name address phone verificationStatus capacity')
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
      .populate('vehicleId', 'vehicleId shortVehicleNumber registrationNumber ownershipType modelName')
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
 * Generates permanent structured Vehicle ID (e.g. DH-OWN-0001)
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

    const { shortVehicleNumber, registrationNumber, modelName, manufacturingYear, city, area } = req.body;

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

    // Generate structured human-readable Vehicle ID for self-owned vehicle (e.g. DH-OWN-0001)
    const { vehicleId, cityCode } = await generateSelfOwnedVehicleId(city || driverDoc.city || 'Dhaka');
    const qrIdentifier = qrService.generateSignedToken(vehicleId || cleanShortNum);

    // Upsert driver's self-owned vehicle
    let vehicle = await Vehicle.findOne({
      assignedDriverId: req.user!.id,
      ownershipType: 'SELF_OWNED',
    });

    if (vehicle) {
      if (!vehicle.vehicleId) vehicle.vehicleId = vehicleId;
      vehicle.shortVehicleNumber = cleanShortNum;
      vehicle.registrationNumber = cleanRegNum;
      vehicle.qrIdentifier = qrIdentifier;
      vehicle.city = city ? city.trim() : vehicle.city || 'Dhaka';
      vehicle.cityCode = cityCode;
      vehicle.area = area ? area.trim() : vehicle.area;
      vehicle.modelName = modelName ? modelName.trim() : vehicle.modelName;
      vehicle.manufacturingYear = manufacturingYear ? Number(manufacturingYear) : vehicle.manufacturingYear;
      vehicle.verificationStatus = 'PENDING'; // Resubmits for Admin vehicle approval
      await vehicle.save();
    } else {
      vehicle = await Vehicle.create({
        vehicleId,
        shortVehicleNumber: cleanShortNum,
        registrationNumber: cleanRegNum,
        qrIdentifier,
        ownershipType: 'SELF_OWNED',
        city: city ? city.trim() : driverDoc.city || 'Dhaka',
        cityCode,
        area: area ? area.trim() : driverDoc.area,
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
        vehicleId: vehicle.vehicleId,
        shortVehicleNumber: vehicle.shortVehicleNumber,
        registrationNumber: vehicle.registrationNumber,
        driverId: req.user!.id,
      },
    });

    res.status(200).json({
      success: true,
      message: `Self-Owned Rickshaw [${vehicle.vehicleId}] registered successfully and submitted for Admin approval.`,
      vehicle,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to register self-owned vehicle', details: error.message });
  }
});

export default router;
