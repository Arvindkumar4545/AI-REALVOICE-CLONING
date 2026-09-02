import { Request, Response, NextFunction } from 'express';
import os from 'os';
import { UserRepository, AuditRepository, DetectionRepository } from '../models/repository.js';
import { getQueueDepth } from '../queue/index.js';
import { mlService } from '../services/mlService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

export class AdminController {
  static async getOverview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users, total: totalUsers } = await UserRepository.getAllUsers(10, 0);
      const auditLogs = await AuditRepository.getLogs(20);
      const queueDepth = getQueueDepth();

      // Fetch detection activity to display threat metrics
      const { items: recentDetections, total: totalDetections } = await DetectionRepository.getHistory({
        limit: 20,
        offset: 0,
      });
      const spoofCount = recentDetections.filter((r: any) => r.prediction === 'SPOOF').length;
      const bonaFideCount = recentDetections.filter((r: any) => r.prediction === 'BONA_FIDE').length;
      const avgRiskScore = recentDetections.length > 0
        ? recentDetections.reduce((sum: number, r: any) => sum + (Number(r.risk_score) || 0), 0) / recentDetections.length
        : 0;

      let mlStatus = 'offline';
      let mlInfo = null;
      try {
        mlInfo = await mlService.getModelInfo();
        mlStatus = 'healthy';
      } catch (e) {
        mlStatus = 'unavailable';
      }

      const cpus = os.cpus();
      const freeMem = os.freemem();
      const totalMem = os.totalmem();
      const memoryUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

      res.status(200).json({
        success: true,
        data: {
          system: {
            uptime_seconds: process.uptime(),
            node_version: process.version,
            platform: process.platform,
            cpu_cores: cpus.length,
            memory_usage_percent: memoryUsagePercent,
            memory_free_mb: Math.round(freeMem / (1024 * 1024)),
            memory_total_mb: Math.round(totalMem / (1024 * 1024)),
          },
          telemetry: {
            total_users: totalUsers,
            queue_depth: queueDepth,
            ml_service_status: mlStatus,
            model_info: mlInfo,
            total_detections_24h: totalDetections,
            spoof_detected_24h: spoofCount,
            bona_fide_24h: bonaFideCount,
            average_risk_score_24h: Number(avgRiskScore.toFixed(2)),
            total_reports_24h: 0, // Placeholder until report stats are added
          },
          recent_users: users.map((u) => ({
            id: u.id,
            email: u.email,
            role: u.role,
            is_verified: u.is_verified,
            created_at: u.created_at,
          })),
          recent_audit_logs: auditLogs,
          recent_detections: recentDetections.slice(0, 5),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getUsers(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const { users, total } = await UserRepository.getAllUsers(limit, offset);

      res.status(200).json({
        success: true,
        data: {
          items: users.map((u) => ({
            id: u.id,
            email: u.email,
            full_name: u.full_name,
            role: u.role,
            is_verified: u.is_verified,
            api_quota_daily: u.api_quota_daily,
            api_usage_today: u.api_usage_today,
            created_at: u.created_at,
          })),
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

  static async getAuditLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit as string || '50', 10)));
      const logs = await AuditRepository.getLogs(limit);
      res.status(200).json({ success: true, data: { items: logs, total: logs.length } });
    } catch (err) {
      next(err);
    }
  }
}

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
