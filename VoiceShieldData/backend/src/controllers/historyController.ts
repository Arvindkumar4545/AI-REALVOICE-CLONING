import { Request, Response, NextFunction } from 'express';
import { DetectionRepository } from '../models/repository.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

export class HistoryController {
  static async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const prediction = req.query.prediction as string | undefined;
      const minRisk = req.query.minRisk ? parseFloat(req.query.minRisk as string) : undefined;
      const userId = req.user?.role === 'admin' && req.query.all === 'true' ? undefined : req.user?.id;

      const { items, total } = await DetectionRepository.getHistory({
        userId,
        prediction,
        minRisk,
        limit,
        offset,
      });

      res.status(200).json({
        success: true,
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            total_pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteHistory(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
        return;
      }

      await DetectionRepository.deleteHistoryByUserId(req.user.id);

      res.status(200).json({
        success: true,
        message: 'Detection history cleared successfully.',
      });
    } catch (err) {
      next(err);
    }
  }
}
