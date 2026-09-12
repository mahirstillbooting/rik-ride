import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User';

export interface AuthenticatedUser {
  id: string;
  phone: string;
  role: UserRole;
  garageId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Role Authorization Middleware
 * Verifies that the authenticated request caller holds one of the specified allowed roles.
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
