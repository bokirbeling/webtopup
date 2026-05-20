import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export type AuthUser = {
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'pengguna';
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please login.'
      }
    });
    return;
  }

  const token = authHeader.substring(7); // Remove 'Bearer '
  
  try {
    const jwtSecret = process.env.JWT_SECRET || "test-only-jwt-secret-at-least-32-bytes";
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired token. Please login again.'
      }
    });
  }
}

export function requireRole(...allowedRoles: Array<'admin' | 'seller' | 'pengguna'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        }
      });
      return;
    }

    next();
  };
}
