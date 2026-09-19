import { Router, Request, Response } from 'express';
import { authService } from '../services/authService';
import { otpService } from '../services/otpService';
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
 * PUT /api/auth/profile
 * Update user profile details. Enforces immutability on protected identity fields (name & nidNumber).
 */
router.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User profile not found.' });
      return;
    }

    const { name, nidNumber, email, city, area, address } = req.body;

    // Check if user is attempting to edit protected identity fields
    if (name && name.trim() !== user.name) {
      if (user.isIdentityProtected || user.accountStatus === 'ACTIVE') {
        res.status(403).json({
          error: 'Protected Identity Field: Name cannot be directly edited. Submit an identity change request for Admin review.',
          protectedField: 'name',
        });
        return;
      } else {
        user.name = name.trim();
      }
    }

    if (nidNumber && nidNumber.trim() !== (user.nidNumber || '')) {
      if (user.nidNumber && user.nidStatus === 'VERIFIED') {
        res.status(403).json({
          error: 'Protected Identity Field: Verified NID number cannot be directly edited. Submit an identity change request for Admin review.',
          protectedField: 'nidNumber',
        });
        return;
      }

      // Check NID uniqueness
      const existingNid = await User.findOne({
        nidNumber: nidNumber.trim(),
        _id: { $ne: user._id },
      });
      if (existingNid) {
        res.status(400).json({ error: `NID number [${nidNumber.trim()}] is already registered under another account.` });
        return;
      }

      user.nidNumber = nidNumber.trim();
      user.nidStatus = 'PENDING';
    }

    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (city !== undefined) user.city = city.trim();
    if (area !== undefined) user.area = area.trim();
    if (address !== undefined) user.address = address.trim();

    await user.save();

    res.json({
      success: true,
      message: 'Profile details updated successfully.',
      user: user.toAuthJSON(),
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update profile details', details: error.message });
  }
});

/**
 * POST /api/auth/forgot-password/request-otp
 * Dispatches secure 6-digit OTP for password reset.
 */
router.post('/forgot-password/request-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Please provide a valid registered email address.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    // Safe generic response to prevent account enumeration
    if (!user) {
      res.json({
        success: true,
        message: 'If an account exists for this email address, a verification OTP code has been sent.',
        cooldownSeconds: 60,
      });
      return;
    }

    const result = await otpService.createAndSendOtp(cleanEmail, 'FORGOT_PASSWORD', user.name);
    if (!result.success) {
      res.status(result.cooldownSeconds ? 429 : 400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'Verification OTP sent to your registered email address.',
      cooldownSeconds: result.cooldownSeconds || 60,
    });
  } catch (error: any) {
    console.error('[AuthRoutes] Request OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to dispatch password reset OTP.' });
  }
});

/**
 * POST /api/auth/forgot-password/verify-otp
 * Verifies 6-digit numeric OTP and returns a single-use reset token.
 */
router.post('/forgot-password/verify-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, error: 'Email and 6-digit OTP code are required.' });
      return;
    }

    const result = await otpService.verifyOtp(email, otp, 'FORGOT_PASSWORD');
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      resetToken: result.resetToken,
    });
  } catch (error: any) {
    console.error('[AuthRoutes] Verify OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify OTP code.' });
  }
});

/**
 * POST /api/auth/forgot-password/reset-password
 * Resets user password using the single-use reset token.
 */
router.post('/forgot-password/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, resetToken, newPassword } = req.body;
    if (!email || !resetToken || !newPassword) {
      res.status(400).json({ success: false, error: 'Email, reset token, and new password are required.' });
      return;
    }

    const isValidToken = await otpService.validateAndConsumeResetToken(email, resetToken);
    if (!isValidToken) {
      res.status(400).json({ success: false, error: 'Invalid or expired password reset session. Please request a new OTP.' });
      return;
    }

    const result = await authService.resetPassword(email, newPassword);
    if (!result.success) {
      res.status(400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'Your password has been reset successfully. You may now sign in with your new password.',
    });
  } catch (error: any) {
    console.error('[AuthRoutes] Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password.' });
  }
});

/**
 * POST /api/auth/register/request-otp
 * Dispatches email verification OTP for role onboarding.
 */
router.post('/register/request-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, phone, role } = req.body;

    // Strict server-side role check: Public signup prohibits ADMIN role
    if (role === 'ADMIN') {
      res.status(403).json({ success: false, error: 'Public registration for System Administrator role is strictly prohibited.' });
      return;
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
      return;
    }

    if (!phone || phone.trim().length < 10) {
      res.status(400).json({ success: false, error: 'Please enter a valid phone number.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check if phone or email is already registered
    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });

    if (existingUser) {
      if (existingUser.email === cleanEmail) {
        res.status(400).json({ success: false, error: 'An account with this email address is already registered.' });
      } else {
        res.status(400).json({ success: false, error: 'An account with this phone number is already registered.' });
      }
      return;
    }

    const result = await otpService.createAndSendOtp(cleanEmail, 'EMAIL_VERIFICATION');
    if (!result.success) {
      res.status(result.cooldownSeconds ? 429 : 400).json(result);
      return;
    }

    res.json({
      success: true,
      message: 'Email verification OTP sent successfully.',
      cooldownSeconds: result.cooldownSeconds || 60,
    });
  } catch (error: any) {
    console.error('[AuthRoutes] Register request OTP error:', error);
    res.status(500).json({ success: false, error: 'Failed to send registration OTP.' });
  }
});

/**
 * POST /api/auth/register/verify-and-create
 * Verifies email OTP and completes role-based user onboarding.
 */
router.post('/register/verify-and-create', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      email,
      otp,
      phone,
      name,
      password,
      role,
      driverMode,
      nidNumber,
      dateOfBirth,
      nidFrontDocumentRef,
      nidBackDocumentRef,
      city,
      area,
      address,
      garageName,
      garageAddress,
      garageCapacity,
    } = req.body;

    // Strict server-side role check: Public signup prohibits ADMIN role
    if (role === 'ADMIN') {
      res.status(403).json({ success: false, error: 'Public registration for System Administrator role is strictly prohibited.' });
      return;
    }

    if (!['PASSENGER', 'GARAGE_OWNER', 'DRIVER'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid registration role specified.' });
      return;
    }

    if (!name || !phone || !email || !password || !otp) {
      res.status(400).json({ success: false, error: 'Name, phone, email, password, and OTP code are required.' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters long.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Verify Email OTP
    const otpResult = await otpService.verifyOtp(cleanEmail, otp, 'EMAIL_VERIFICATION');
    if (!otpResult.success) {
      res.status(400).json(otpResult);
      return;
    }

    // Double-check user uniqueness
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    });
    if (existing) {
      res.status(400).json({ success: false, error: 'Phone number or email is already registered.' });
      return;
    }

    // Determine operational account status: PASSENGER -> ACTIVE, DRIVER/GARAGE_OWNER -> PENDING
    let accountStatus: AccountStatus = 'ACTIVE';
    if (role === 'GARAGE_OWNER' || role === 'DRIVER') {
      accountStatus = 'PENDING';
    }

    const passwordHash = await authService.hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      passwordHash,
      role: role as UserRole,
      driverMode: role === 'DRIVER' ? (driverMode as DriverOperatingMode) || 'SELF_OWNED' : undefined,
      accountStatus,
      nidNumber: nidNumber ? nidNumber.trim() : undefined,
      dateOfBirth: dateOfBirth ? dateOfBirth : undefined,
      nidFrontDocumentRef: nidFrontDocumentRef ? nidFrontDocumentRef.trim() : undefined,
      nidBackDocumentRef: nidBackDocumentRef ? nidBackDocumentRef.trim() : undefined,
      nidStatus: nidNumber || nidFrontDocumentRef ? 'PENDING' : undefined,
      city: city || 'Dhaka',
      area: area ? area.trim() : undefined,
      address: address ? address.trim() : undefined,
      isIdentityProtected: true,
    });

    // If registering as Garage Owner, create Garage application record
    if (role === 'GARAGE_OWNER') {
      const { Garage } = await import('../models/Garage');
      const { generateGarageId } = await import('../services/idGeneratorService');
      const { garageId: garageCustomId } = await generateGarageId(city || 'Dhaka');

      await Garage.create({
        garageId: garageCustomId,
        ownerId: newUser._id,
        name: garageName ? garageName.trim() : `${name.trim()}'s Rickshaw Garage`,
        city: city || 'Dhaka',
        cityCode: 'DH',
        area: area ? area.trim() : 'Dhaka Central',
        address: garageAddress ? garageAddress.trim() : (address ? address.trim() : 'Dhaka, Bangladesh'),
        phone: cleanPhone,
        verificationStatus: 'PENDING',
        capacity: Number(garageCapacity) || 10,
      });
    }

    if (accountStatus === 'ACTIVE') {
      const token = authService.generateToken(newUser);
      res.json({
        success: true,
        message: 'Account created successfully!',
        token,
        user: newUser.toAuthJSON(),
        accountStatus: 'ACTIVE',
      });
    } else {
      res.json({
        success: true,
        message:
          role === 'GARAGE_OWNER'
            ? 'Garage Owner application submitted successfully! Your account is pending operational approval by System Administrator.'
            : 'Driver registration submitted successfully! Your account is pending operational approval by System Administrator.',
        accountStatus: 'PENDING',
        user: newUser.toAuthJSON(),
      });
    }
  } catch (error: any) {
    console.error('[AuthRoutes] Register verify and create error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete account registration.' });
  }
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
    const userMap: Record<string, any> = {};

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
      userMap[u.phone] = updated;
      results.push({ phone: updated.phone, role: updated.role, status: updated.accountStatus });
    }

    // Seed test Garage for Dhaka Central Garage Owner (01700000002)
    const garageOwnerUser = userMap['01700000002'];
    if (garageOwnerUser) {
      const { Garage } = await import('../models/Garage');
      const { Vehicle } = await import('../models/Vehicle');
      const { GarageDriver } = await import('../models/GarageDriver');
      const { VehicleDriver } = await import('../models/VehicleDriver');
      const { qrService } = await import('../services/qrService');

      const testGarage = await Garage.findOneAndUpdate(
        { ownerId: garageOwnerUser._id },
        {
          garageId: 'DH-GAR-0001',
          name: 'Dhaka Central Rickshaw Hub',
          city: 'Dhaka',
          cityCode: 'DH',
          area: 'Motijheel',
          address: 'Motijheel Commercial Area, Dhaka 1000',
          phone: '01700000002',
          verificationStatus: 'APPROVED',
          capacity: 15,
        },
        { upsert: true, new: true }
      );

      // Seed initial test vehicles under this garage
      const v1 = await Vehicle.findOneAndUpdate(
        { shortVehicleNumber: 'TP1092' },
        {
          vehicleId: 'DH-GAR-0001-V001',
          garageCustomId: 'DH-GAR-0001',
          registrationNumber: 'DHK-HA-1092',
          qrIdentifier: qrService.generateSignedToken('DH-GAR-0001-V001'),
          ownershipType: 'GARAGE_REGISTERED',
          city: 'Dhaka',
          cityCode: 'DH',
          area: 'Motijheel',
          garageId: testGarage._id,
          verificationStatus: 'APPROVED',
          status: 'AVAILABLE',
          modelName: 'Standard Electric Rickshaw v2',
          manufacturingYear: 2024,
        },
        { upsert: true, new: true }
      );

      const v2 = await Vehicle.findOneAndUpdate(
        { shortVehicleNumber: 'DHK-1042' },
        {
          vehicleId: 'DH-GAR-0001-V002',
          garageCustomId: 'DH-GAR-0001',
          registrationNumber: 'DHK-HA-1042',
          qrIdentifier: qrService.generateSignedToken('DH-GAR-0001-V002'),
          ownershipType: 'GARAGE_REGISTERED',
          city: 'Dhaka',
          cityCode: 'DH',
          area: 'Motijheel',
          garageId: testGarage._id,
          verificationStatus: 'APPROVED',
          status: 'AVAILABLE',
          modelName: 'EcoRide Heavy Cargo',
          manufacturingYear: 2023,
        },
        { upsert: true, new: true }
      );

      await Vehicle.findOneAndUpdate(
        { shortVehicleNumber: 'TP1099' },
        {
          vehicleId: 'DH-GAR-0001-V003',
          garageCustomId: 'DH-GAR-0001',
          registrationNumber: 'DHK-HA-1099',
          qrIdentifier: qrService.generateSignedToken('DH-GAR-0001-V003'),
          ownershipType: 'GARAGE_REGISTERED',
          city: 'Dhaka',
          cityCode: 'DH',
          area: 'Motijheel',
          garageId: testGarage._id,
          verificationStatus: 'PENDING',
          status: 'OFFLINE',
          modelName: 'Standard Electric Rickshaw v1',
          manufacturingYear: 2024,
        },
        { upsert: true, new: true }
      );

      // Seed GarageDriver link for Rahim (01700000003)
      const rahimUser = userMap['01700000003'];
      if (rahimUser) {
        rahimUser.nidNumber = '19922691234567891';
        rahimUser.nidStatus = 'VERIFIED';
        rahimUser.city = 'Dhaka';
        rahimUser.area = 'Motijheel';
        await rahimUser.save();

        await GarageDriver.findOneAndUpdate(
          { garageId: testGarage._id, driverId: rahimUser._id },
          { status: 'ACTIVE', assignedAt: new Date() },
          { upsert: true, new: true }
        );

        // Assign Rahim to TP1092
        v1.assignedDriverId = rahimUser._id;
        await v1.save();

        await VehicleDriver.findOneAndUpdate(
          { vehicleId: v1._id, driverId: rahimUser._id, isCurrent: true },
          { assignedAt: new Date(), isCurrent: true },
          { upsert: true, new: true }
        );
      }
    }

    // Seed test Self-Owned Vehicle for Karim (01700000004)
    const karimUser = userMap['01700000004'];
    if (karimUser) {
      const { Vehicle } = await import('../models/Vehicle');
      const { VehicleDriver } = await import('../models/VehicleDriver');
      const { qrService } = await import('../services/qrService');

      karimUser.nidNumber = '19952691234567892';
      karimUser.nidStatus = 'VERIFIED';
      karimUser.city = 'Dhaka';
      karimUser.area = 'Dhanmondi';
      await karimUser.save();

      const selfVeh = await Vehicle.findOneAndUpdate(
        { shortVehicleNumber: 'SV-2041' },
        {
          vehicleId: 'DH-OWN-0001',
          registrationNumber: 'DHK-HA-2041',
          qrIdentifier: qrService.generateSignedToken('DH-OWN-0001'),
          ownershipType: 'SELF_OWNED',
          city: 'Dhaka',
          cityCode: 'DH',
          area: 'Dhanmondi',
          assignedDriverId: karimUser._id,
          verificationStatus: 'APPROVED',
          status: 'OFFLINE',
          modelName: 'Private Solar Rickshaw Pro',
          manufacturingYear: 2024,
        },
        { upsert: true, new: true }
      );

      await VehicleDriver.findOneAndUpdate(
        { vehicleId: selfVeh._id, driverId: karimUser._id, isCurrent: true },
        { assignedAt: new Date(), isCurrent: true },
        { upsert: true, new: true }
      );
    }

    res.json({
      success: true,
      message: 'Development test accounts, garage, vehicles, and drivers seeded successfully!',
      defaultPassword,
      accounts: results,
    });
  } catch (error) {
    console.error('[AuthRoutes] Seed error:', error);
    res.status(500).json({ success: false, error: 'Failed to seed test accounts' });
  }
});

export default router;
