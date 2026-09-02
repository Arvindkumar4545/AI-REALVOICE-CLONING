import { query } from '../database/index.js';
import {
  User,
  Session,
  DetectionRequest,
  DetectionResult,
  AudioMetadata,
  ScamReport,
  LocationEvent,
  ApiUsage,
  AuditLog,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class UserRepository {
  static async findByEmail(email: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email.toLowerCase().trim()]);
    return res.rows[0] || null;
  }

  static async findById(id: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  }

  static async findByApiKey(apiKey: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE api_key = $1 LIMIT 1', [apiKey]);
    return res.rows[0] || null;
  }

  static async findByVerificationToken(token: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE verification_token = $1 LIMIT 1', [token]);
    return res.rows[0] || null;
  }

  static async findByResetToken(token: string): Promise<User | null> {
    const res = await query<User>('SELECT * FROM users WHERE reset_password_token = $1 LIMIT 1', [token]);
    return res.rows[0] || null;
  }

  static async create(user: Partial<User>): Promise<User> {
    const id = user.id || `usr_${uuidv4().replace(/-/g, '')}`;
    const res = await query<User>(
      `INSERT INTO users (id, email, password_hash, full_name, role, is_verified, verification_token, api_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        user.email?.toLowerCase().trim(),
        user.password_hash,
        user.full_name || null,
        user.role || 'user',
        user.is_verified ?? false,
        user.verification_token || null,
        user.api_key || `vsh_live_${uuidv4().replace(/-/g, '')}`,
      ]
    );
    return res.rows[0];
  }

  static async update(id: string, fields: Partial<User>): Promise<User | null> {
    const user = await this.findById(id);
    if (!user) return null;
    Object.assign(user, fields, { updated_at: new Date() });
    return user;
  }

  static async delete(id: string): Promise<boolean> {
    await query('DELETE FROM users WHERE id = $1', [id]);
    return true;
  }

  static async getAllUsers(limit: number = 50, offset: number = 0): Promise<{ users: User[]; total: number }> {
    const res = await query<User>('SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return { users: res.rows, total: res.rows.length };
  }
}

export class DetectionRepository {
  static async createRequest(req: Partial<DetectionRequest>): Promise<DetectionRequest> {
    const id = req.id || `dr_${uuidv4().replace(/-/g, '')}`;
    const requestId = req.request_id || `req_${uuidv4()}`;
    const res = await query<DetectionRequest>(
      `INSERT INTO detection_requests (id, request_id, user_id, file_name, file_size_bytes, mime_type, file_hash_sha256, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        id,
        requestId,
        req.user_id || null,
        req.file_name,
        req.file_size_bytes,
        req.mime_type,
        req.file_hash_sha256 || null,
        req.status || 'queued',
      ]
    );
    return res.rows[0];
  }

  static async findRequestById(requestId: string): Promise<DetectionRequest | null> {
    const res = await query<DetectionRequest>('SELECT * FROM detection_requests WHERE request_id = $1 LIMIT 1', [requestId]);
    return res.rows[0] || null;
  }

  static async saveResult(resData: Partial<DetectionResult>): Promise<DetectionResult> {
    const id = resData.id || `res_${uuidv4().replace(/-/g, '')}`;
    const res = await query<DetectionResult>(
      `INSERT INTO detection_results (
        id, request_id, user_id, prediction, confidence, risk_score, fraud_risk,
        spoof_probability, bona_fide_probability, raw_probability,
        processing_time_ms, model_name, model_version, checkpoint_hash,
        forensics_json, explainability_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [
        id,
        resData.request_id,
        resData.user_id || null,
        resData.prediction,
        resData.confidence,
        resData.risk_score,
        resData.fraud_risk ?? 0,
        resData.spoof_probability,
        resData.bona_fide_probability,
        resData.raw_probability,
        resData.processing_time_ms,
        resData.model_name,
        resData.model_version,
        resData.checkpoint_hash,
        JSON.stringify(resData.forensics_json || {}),
        JSON.stringify(resData.explainability_json || []),
      ]
    );
    return res.rows[0];
  }

  static async getResultByRequestId(requestId: string): Promise<DetectionResult | null> {
    const res = await query<DetectionResult>('SELECT * FROM detection_results WHERE request_id = $1 LIMIT 1', [requestId]);
    return res.rows[0] || null;
  }

  static async getHistory(params: {
    userId?: string;
    prediction?: string;
    minRisk?: number;
    limit: number;
    offset: number;
  }): Promise<{ items: any[]; total: number }> {
    const res = await query('SELECT * FROM detection_results ORDER BY created_at DESC');
    let rows = res.rows;
    if (params.userId) {
      rows = rows.filter((r: any) => r.user_id === params.userId);
    }
    if (params.prediction) {
      rows = rows.filter((r: any) => r.prediction === params.prediction);
    }
    if (params.minRisk !== undefined) {
      rows = rows.filter((r: any) => Number(r.risk_score) >= params.minRisk!);
    }
    const total = rows.length;
    const items = rows.slice(params.offset, params.offset + params.limit);
    return { items, total };
  }

  static async deleteHistoryByUserId(userId: string): Promise<void> {
    await query('DELETE FROM detection_requests WHERE user_id = $1', [userId]);
  }
}

export class ReportRepository {
  static async createReport(report: Partial<ScamReport>): Promise<ScamReport> {
    const id = report.id || `rep_${uuidv4().replace(/-/g, '')}`;
    const res = await query<ScamReport>(
      `INSERT INTO scam_reports (
        id, user_id, detection_request_id, category, description, phone_number,
        threat_severity, latitude, longitude, accuracy_meters, country, region, city,
        evidence_files, consent_given, network_metadata, escalation_status, law_enforcement_ref
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        id,
        report.user_id || null,
        report.detection_request_id || null,
        report.category,
        report.description,
        report.phone_number || null,
        report.threat_severity || 'medium',
        report.latitude || null,
        report.longitude || null,
        report.accuracy_meters || null,
        report.country || 'India',
        report.region || null,
        report.city || null,
        JSON.stringify(report.evidence_files || []),
        report.consent_given || false,
        JSON.stringify(report.network_metadata || {}),
        report.escalation_status || 'Draft',
        report.law_enforcement_ref || null,
      ]
    );
    return res.rows[0];
  }

  static async getThreatCoordinates(): Promise<LocationEvent[]> {
    const res = await query<LocationEvent>('SELECT * FROM location_events ORDER BY created_at DESC');
    return res.rows;
  }

  static async getAllReports(limit: number = 50, offset: number = 0): Promise<{ reports: ScamReport[]; total: number }> {
    const res = await query<ScamReport>('SELECT * FROM scam_reports ORDER BY created_at DESC');
    const total = res.rows.length;
    const reports = res.rows.slice(offset, offset + limit);
    return { reports, total };
  }
}

export class StatisticsRepository {
  static async getAggregateStatistics(): Promise<any> {
    const res = await query('SELECT COUNT(*) as total FROM detection_results');
    return res.rows[0] || {
      total_analyses: 0,
      spoof_detected: 0,
      bona_fide: 0,
      avg_risk_score: 0,
      avg_confidence: 0,
      avg_processing_time_ms: 0,
    };
  }
}

export class AuditRepository {
  static async log(entry: Partial<AuditLog>): Promise<void> {
    const id = entry.id || `aud_${uuidv4().replace(/-/g, '')}`;
    await query(
      `INSERT INTO audit_logs (id, user_id, action, resource, resource_id, metadata_json, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        entry.user_id || null,
        entry.action,
        entry.resource,
        entry.resource_id || null,
        JSON.stringify(entry.metadata_json || {}),
        entry.ip_address || null,
      ]
    );
  }

  static async getLogs(limit: number = 100): Promise<AuditLog[]> {
    const res = await query<AuditLog>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    return res.rows;
  }
}
