import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/jwt.js';
import { getStore } from '../models/store.js';
import { UserRole } from '../models/types.js';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required. No Bearer token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    const store = getStore();
    const user = store.users.find(u => u._id === decoded.userId);

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, message: 'User account is inactive or no longer exists.' });
      return;
    }

    req.user = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role
    };
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
    return;
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized. Please log in.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. Action restricted to: ${allowedRoles.join(', ')}.`
      });
      return;
    }

    next();
  };
}
