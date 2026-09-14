import { Request, Response, NextFunction } from 'express';
import { authService, JWTPayload } from '../services/authService';
import { User, IUser, UserRole, DriverOperatingMode, AccountStatus } from '../models/User';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  driverMode?: DriverOperatingMode;
  accountStatus: AccountStatus;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Authentication Middleware
 * Extracts Bearer JWT token from Authorization header, validates signature, and populates req.user.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload: JWTPayload = authService.verifyToken(token);
    const userDoc = await User.findById(payload.id);

    if (!userDoc) {
      res.status(401).json({ error: 'Unauthorized: User no longer exists' });
      return;
    }

    req.user = {
      id: (userDoc._id as object).toString(),
      phone: userDoc.phone,
      name: userDoc.name,
      role: userDoc.role,
      driverMode: userDoc.driverMode,
      accountStatus: userDoc.accountStatus,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Session expired or token invalid' });
  }
}

/**
 * Role Authorization Middleware
 * Enforces that req.user holds one of the specified allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Forbidden: Access requires role [${allowedRoles.join(', ')}]. Current role: [${req.user.role}]`,
      });
      return;
    }

    next();
  };
}

/**
 * Account Status Middleware
 * Enforces that req.user accountStatus is ACTIVE.
 */
export function requireActiveUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized: Authentication required' });
    return;
  }

  if (req.user.accountStatus !== 'ACTIVE') {
    res.status(403).json({
      error: `Account not operational. Current account status: [${req.user.accountStatus}]`,
      accountStatus: req.user.accountStatus,
    });
    return;
  }

  next();
}

/**
 * Driver Operating Mode Middleware
 * Enforces driver operating mode requirement (GARAGE_REGISTERED vs SELF_OWNED).
 */
export function requireDriverMode(requiredMode: DriverOperatingMode) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    if (req.user.role !== 'DRIVER') {
      res.status(403).json({ error: 'Forbidden: Driver role required' });
      return;
    }

    if (req.user.driverMode !== requiredMode) {
      res.status(403).json({
        error: `Forbidden: Requires driver mode [${requiredMode}]. Current driver mode: [${req.user.driverMode || 'UNSPECIFIED'}]`,
      });
      return;
    }

    next();
  };
}
