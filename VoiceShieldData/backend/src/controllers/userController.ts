import { Request, Response, NextFunction } from 'express';
import { UserRepository, AuditRepository, DetectionRepository } from '../models/repository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export class UserController {
  static async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const { full_name } = req.body;
      const updated = await UserRepository.update(req.user.id, { full_name });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  static async generateApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const newApiKey = `vsh_live_${uuidv4().replace(/-/g, '')}`;
      await UserRepository.update(req.user.id, { api_key: newApiKey });

      await AuditRepository.log({
        user_id: req.user.id,
        action: 'API_KEY_GENERATED',
        resource: 'users',
        resource_id: req.user.id,
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'New API Key generated successfully.',
        data: { api_key: newApiKey },
      });
    } catch (err) {
      next(err);
    }
  }

  static async exportData(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      const user = await UserRepository.findById(req.user.id);
      const history = await DetectionRepository.getHistory({ userId: req.user.id, limit: 1000, offset: 0 });

      res.status(200).json({
        success: true,
        data: {
          user_profile: {
            id: user?.id,
            email: user?.email,
            full_name: user?.full_name,
            created_at: user?.created_at,
          },
          detection_history: history.items,
          exported_at: new Date().toISOString(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAccount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      await DetectionRepository.deleteHistoryByUserId(req.user.id);
      await UserRepository.delete(req.user.id);

      await AuditRepository.log({
        user_id: req.user.id,
        action: 'USER_ACCOUNT_DELETED',
        resource: 'users',
        resource_id: req.user.id,
        ip_address: req.ip,
      });

      res.status(200).json({
        success: true,
        message: 'Account and associated data deleted permanently.',
      });
    } catch (err) {
      next(err);
    }
  }
}
