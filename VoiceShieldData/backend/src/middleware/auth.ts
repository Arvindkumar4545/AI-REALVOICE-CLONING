import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UserRepository } from '../models/repository.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: string };
      req.user = decoded;
      return next();
    } catch (err) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired access token' },
      });
      return;
    }
  }

  // Support API Key for programmatic access
  if (apiKey) {
    UserRepository.findByApiKey(apiKey)
      .then((user) => {
        if (user) {
          req.user = { id: user.id, email: user.email, role: user.role };
          return next();
        }
        res.status(401).json({
          success: false,
          error: { code: 'INVALID_API_KEY', message: 'Provided API Key is invalid' },
        });
      })
      .catch((err) => next(err));
    return;
  }

  res.status(401).json({
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
  });
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: string };
      req.user = decoded;
    } catch (err) {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Elevated administrator privileges required' },
    });
    return;
  }
  next();
}

export function requireInvestigator(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || !['admin', 'investigator', 'law_enforcement'].includes(req.user.role)) {
    res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Authorized investigation privileges required' },
    });
    return;
  }
  next();
}
