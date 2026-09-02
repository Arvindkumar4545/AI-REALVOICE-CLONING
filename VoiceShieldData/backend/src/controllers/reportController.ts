import { Request, Response, NextFunction } from 'express';
import { ReportRepository, AuditRepository } from '../models/repository.js';
import { ScamReportSchema } from '../validators/schemas.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { wsManager } from '../websocket/index.js';

export class ReportController {
  static async createReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = ScamReportSchema.parse(req.body);
      const userId = req.user?.id || null;

      const report = await ReportRepository.createReport({
        user_id: userId,
        detection_request_id: data.detection_request_id,
        category: data.category,
        description: data.description,
        phone_number: data.phone_number,
        threat_severity: data.threat_severity,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy_meters: data.accuracy_meters,
        country: data.country || 'India',
        region: data.region,
        city: data.city,
      });

      await AuditRepository.log({
        user_id: userId,
        action: 'SCAM_REPORT_SUBMITTED',
        resource: 'scam_reports',
        resource_id: report.id,
        metadata_json: { category: data.category, severity: data.threat_severity },
        ip_address: req.ip,
      });

      // Broadcast anonymized threat point to live map
      if (data.latitude && data.longitude) {
        wsManager.broadcast('NEW_THREAT_REPORT', {
          id: report.id,
          category: report.category,
          threat_level: report.threat_severity,
          latitude: report.latitude,
          longitude: report.longitude,
          country: report.country,
          region: report.region,
          city: report.city,
          created_at: report.created_at,
        });
      }

      res.status(201).json({
        success: true,
        message: 'Scam incident report registered successfully.',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
      const offset = (page - 1) * limit;

      const { reports, total } = await ReportRepository.getAllReports(limit, offset);

      // Mask sensitive phone numbers for public/anonymized list
      const sanitized = reports.map((r) => ({
        ...r,
        phone_number: r.phone_number
          ? r.phone_number.slice(0, 3) + '****' + r.phone_number.slice(-3)
          : null,
      }));

      res.status(200).json({
        success: true,
        data: {
          items: sanitized,
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
}
