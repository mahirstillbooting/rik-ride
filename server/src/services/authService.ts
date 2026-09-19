import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole, DriverOperatingMode, AccountStatus } from '../models/User';
import { env } from '../config/env';

export interface JWTPayload {
  id: string;
  phone: string;
  role: UserRole;
  driverMode?: DriverOperatingMode;
  accountStatus: AccountStatus;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: Record<string, unknown>;
  error?: string;
  accountStatus?: AccountStatus;
}

export class AuthService {
  /**
   * Hashes plaintext password securely using bcryptjs.
   */
  public async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Compares candidate plaintext password against stored bcrypt hash.
   */
  public async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a signed JWT session token.
   */
  public generateToken(user: IUser): string {
    const payload: JWTPayload = {
      id: (user._id as object).toString(),
      phone: user.phone,
      role: user.role,
      driverMode: user.driverMode,
      accountStatus: user.accountStatus,
    };

    return jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
  }

  /**
   * Verifies and decodes a JWT session token.
   */
  public verifyToken(token: string): JWTPayload {
    return jwt.verify(token, env.jwtSecret) as JWTPayload;
  }

  /**
   * Authenticates user using phone/email and plaintext password.
   */
  public async login(identifier: string, password: string): Promise<AuthResult> {
    if (!identifier || !password) {
      return { success: false, error: 'Identifier (phone/email) and password are required' };
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query user including passwordHash
    const user = await User.findOne({
      $or: [{ phone: cleanIdentifier }, { email: cleanIdentifier }],
    }).select('+passwordHash');

    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }

    const isValidPassword = await this.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Check account status
    if (user.accountStatus === 'PENDING') {
      return {
        success: false,
        error: 'Your account is pending operational approval',
        accountStatus: 'PENDING',
      };
    }

    if (user.accountStatus === 'SUSPENDED') {
      return {
        success: false,
        error: 'Your account has been suspended. Please contact platform administration.',
        accountStatus: 'SUSPENDED',
      };
    }

    if (user.accountStatus === 'DISABLED' || user.accountStatus === 'REJECTED') {
      return {
        success: false,
        error: 'Your account is disabled or was rejected',
        accountStatus: user.accountStatus,
      };
    }

    // Update last login timestamp
    user.lastLoginAt = new Date();
    await user.save();

    const token = this.generateToken(user);

    return {
      success: true,
      token,
      user: user.toAuthJSON(),
      accountStatus: user.accountStatus,
    };
  }

  /**
   * Resets user password after OTP validation.
   */
  public async resetPassword(email: string, newPassword: string): Promise<AuthResult> {
    if (!email || !newPassword) {
      return { success: false, error: 'Email and new password are required' };
    }

    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      return { success: false, error: 'Account not found for the specified email address' };
    }

    user.passwordHash = await this.hashPassword(newPassword);
    user.updatedAt = new Date();
    await user.save();

    return {
      success: true,
      user: user.toAuthJSON(),
    };
  }
}

export const authService = new AuthService();
