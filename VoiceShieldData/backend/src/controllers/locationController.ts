import { Request, Response, NextFunction } from 'express';
import { ReportRepository } from '../models/repository.js';

export class LocationController {
  static async getThreatCoordinates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const coordinates = await ReportRepository.getThreatCoordinates();

      // Return strictly anonymized coordinates (approximate 2-decimal precision for privacy preservation)
      const sanitizedPoints = coordinates.map((pt) => ({
        id: pt.id,
        latitude: Number(Number(pt.latitude).toFixed(2)),
        longitude: Number(Number(pt.longitude).toFixed(2)),
        accuracy_meters: pt.accuracy_meters,
        country: pt.country || 'India',
        region: pt.region || 'Unknown',
        city: pt.city || 'Unknown',
        threat_level: pt.threat_level || 'medium',
        created_at: pt.created_at,
      }));

      // Aggregate region counts
      const regionStats: Record<string, number> = {};
      for (const pt of sanitizedPoints) {
        const key = pt.region || 'Other';
        regionStats[key] = (regionStats[key] || 0) + 1;
      }

      res.status(200).json({
        success: true,
        data: {
          points: sanitizedPoints,
          total_events: sanitizedPoints.length,
          region_distribution: regionStats,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

