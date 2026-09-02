import { Request, Response, NextFunction } from 'express';
import { ReportRepository } from '../models/repository.js';
import { query } from '../database/index.js';

export class StatisticsController {
  static async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await ReportRepository.getThreatCoordinates();
      const allResultsRes = await query('SELECT prediction, confidence, risk_score, processing_time_ms FROM detection_results');
      const rows = allResultsRes.rows || [];

      const totalAnalyses = rows.length;
      const spoofDetected = rows.filter((r: any) => (r.prediction || '').toUpperCase().includes('SPOOF')).length;
      const bonaFide = rows.filter((r: any) => (r.prediction || '').toUpperCase().includes('BONA')).length;
      const uncertain = totalAnalyses - spoofDetected - bonaFide;

      const avgConfidence = totalAnalyses > 0
        ? Number((rows.reduce((sum: number, r: any) => sum + Number(r.confidence || 0), 0) / totalAnalyses).toFixed(2))
        : 0;
      const avgRisk = totalAnalyses > 0
        ? Number((rows.reduce((sum: number, r: any) => sum + Number(r.risk_score || 0), 0) / totalAnalyses).toFixed(2))
        : 0;
      const avgLatency = totalAnalyses > 0
        ? Number((rows.reduce((sum: number, r: any) => sum + Number(r.processing_time_ms || 0), 0) / totalAnalyses).toFixed(2))
        : 0;

      res.status(200).json({
        success: true,
        data: {
          total_analyses: totalAnalyses,
          spoof_detected: spoofDetected,
          bona_fide: bonaFide,
          uncertain_detected: Math.max(0, uncertain),
          average_confidence: avgConfidence,
          average_risk_score: avgRisk,
          average_processing_time_ms: avgLatency,
          active_threat_events: stats.length,
          model_name: 'VoiceShield-v2.0.0-Ensemble',
          model_version: 'v2.0.0',
          system_status: 'operational',
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
