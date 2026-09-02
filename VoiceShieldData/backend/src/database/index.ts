import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

let pgPool: Pool | null = null;
let useFallbackStore = false;

// Fallback in-memory persistent relational store for zero-config local dev & standalone test runs
class FallbackStore {
  public users: Map<string, any> = new Map();
  public sessions: Map<string, any> = new Map();
  public detection_requests: Map<string, any> = new Map();
  public detection_results: Map<string, any> = new Map();
  public audio_metadata: Map<string, any> = new Map();
  public scam_reports: Map<string, any> = new Map();
  public location_events: Map<string, any> = new Map();
  public api_usage: Map<string, any> = new Map();
  public audit_logs: Map<string, any> = new Map();
  public investigation_cases: Map<string, any> = new Map();
  public evidence: Map<string, any> = new Map();
  public chain_of_custody: Map<string, any> = new Map();
}

export const fallbackDb = new FallbackStore();

export async function initDatabase(): Promise<void> {
  try {
    const pool = new Pool({
      connectionString: config.database.url,
      min: config.database.poolMin,
      max: config.database.poolMax,
      connectionTimeoutMillis: 3000,
    });

    // Test connection
    const client = await pool.connect();
    pgPool = pool;
    useFallbackStore = false;
    client.release();
    console.log('[Database] Connected to PostgreSQL successfully.');

    // Run schema migration if needed
    const schemaPath = path.resolve(process.cwd(), '../database/schema/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sql = fs.readFileSync(schemaPath, 'utf-8');
      await pgPool.query(sql);
      console.log('[Database] Schema migrations applied successfully.');
    }
  } catch (err: any) {
    console.warn(`[Database] PostgreSQL connection unavailable (${err.message}). Activating embedded resilient store.`);
    useFallbackStore = true;
    seedFallbackStore();
  }
}

function seedFallbackStore() {
  // Seed default admin user (password: Admin@VoiceShield2026!)
  const adminId = 'usr_admin_default_01';
  if (!fallbackDb.users.has(adminId)) {
    fallbackDb.users.set(adminId, {
      id: adminId,
      email: 'admin@voiceshield.ai',
      password_hash: '$2b$10$7IiM/0bGG1ULZEtQOM7YieE3X48XAtqqPjow6wWVyP3r3kdERla6a',
      full_name: 'Security Officer',
      role: 'admin',
      is_verified: true,
      failed_login_attempts: 0,
      lockout_until: null,
      api_key: 'vsh_live_8f7b2c9a1d4e6f3b0c5a7e9d2f4b6a8c',
      api_quota_daily: 500,
      api_usage_today: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }
}

export async function query<T = any>(text: string, params: any[] = []): Promise<any> {
  if (!useFallbackStore && pgPool) {
    return pgPool.query(text, params) as Promise<any>;
  }

  // Handle queries in fallback resilient store
  return executeFallbackQuery<T>(text, params);
}

export function isUsingFallback(): boolean {
  return useFallbackStore;
}

export function getPool(): Pool | null {
  return pgPool;
}

// Fallback SQL query interpreter
function executeFallbackQuery<T = any>(sql: string, params: any[] = []): any {
  const normalized = sql.trim().toLowerCase();

  // Helper for mock result
  const mockResult = (rows: any[]): any => ({
    rows: rows as T[],
    command: 'SELECT',
    rowCount: rows.length,
    oid: 0,
    fields: [],
  });

  // 1. SELECT COUNT / AGGREGATES
  if (normalized.includes('count(') && normalized.includes('from detection_results')) {
    const total = fallbackDb.detection_results.size;
    let spoofCount = 0;
    let bonaFideCount = 0;
    let totalRisk = 0;
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    for (const r of fallbackDb.detection_results.values()) {
      if (r.prediction === 'SPOOF') spoofCount++;
      else bonaFideCount++;
      totalRisk += Number(r.risk_score || 0);
      totalConfidence += Number(r.confidence || 0);
      totalProcessingTime += Number(r.processing_time_ms || 0);
    }

    return mockResult([{
      total_analyses: total,
      spoof_detected: spoofCount,
      bona_fide: bonaFideCount,
      avg_risk_score: total > 0 ? (totalRisk / total).toFixed(2) : 0,
      avg_confidence: total > 0 ? (totalConfidence / total).toFixed(2) : 0,
      avg_processing_time_ms: total > 0 ? (totalProcessingTime / total).toFixed(2) : 0,
    }]);
  }

  // 2. USER QUERIES
  if (normalized.startsWith('select * from users where email =')) {
    const email = params[0]?.toLowerCase();
    const user = Array.from(fallbackDb.users.values()).find(u => u.email.toLowerCase() === email);
    return mockResult(user ? [user] : []);
  }

  if (normalized.startsWith('select * from users where id =')) {
    const id = params[0];
    const user = fallbackDb.users.get(id);
    return mockResult(user ? [user] : []);
  }

  if (normalized.startsWith('select * from users where api_key =')) {
    const key = params[0];
    const user = Array.from(fallbackDb.users.values()).find(u => u.api_key === key);
    return mockResult(user ? [user] : []);
  }

  if (normalized.startsWith('select * from users where verification_token =')) {
    const token = params[0];
    const user = Array.from(fallbackDb.users.values()).find(u => u.verification_token === token);
    return mockResult(user ? [user] : []);
  }

  if (normalized.startsWith('select * from users where reset_password_token =')) {
    const token = params[0];
    const user = Array.from(fallbackDb.users.values()).find(u => u.reset_password_token === token);
    return mockResult(user ? [user] : []);
  }

  // INSERT INTO users
  if (normalized.startsWith('insert into users')) {
    const userObj = {
      id: params[0],
      email: params[1],
      password_hash: params[2],
      full_name: params[3],
      role: params[4] || 'user',
      is_verified: params[5] ?? false,
      verification_token: params[6] ?? null,
      failed_login_attempts: 0,
      lockout_until: null,
      api_key: params[7] || null,
      api_quota_daily: 500,
      api_usage_today: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };
    fallbackDb.users.set(userObj.id, userObj);
    return mockResult([userObj]);
  }

  // 3. DETECTION REQUESTS
  if (normalized.startsWith('insert into detection_requests')) {
    const reqObj = {
      id: params[0],
      request_id: params[1],
      user_id: params[2],
      file_name: params[3],
      file_size_bytes: params[4],
      mime_type: params[5],
      file_hash_sha256: params[6],
      status: params[7] || 'queued',
      error_message: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    fallbackDb.detection_requests.set(reqObj.request_id, reqObj);
    return mockResult([reqObj]);
  }

  if (normalized.startsWith('select * from detection_requests where request_id =')) {
    const req = fallbackDb.detection_requests.get(params[0]);
    return mockResult(req ? [req] : []);
  }

  // 4. DETECTION RESULTS
  if (normalized.startsWith('insert into detection_results')) {
    const resObj = {
      id: params[0],
      request_id: params[1],
      user_id: params[2],
      prediction: params[3],
      confidence: params[4],
      risk_score: params[5],
      fraud_risk: params[6],
      spoof_probability: params[7],
      bona_fide_probability: params[8],
      raw_probability: params[9],
      processing_time_ms: params[10],
      model_name: params[11],
      model_version: params[12],
      checkpoint_hash: params[13],
      forensics_json: typeof params[14] === 'string' ? JSON.parse(params[14]) : params[14],
      explainability_json: typeof params[15] === 'string' ? JSON.parse(params[15]) : params[15],
      created_at: new Date(),
    };
    fallbackDb.detection_results.set(resObj.request_id, resObj);
    // Update request status
    const req = fallbackDb.detection_requests.get(resObj.request_id);
    if (req) req.status = 'completed';
    return mockResult([resObj]);
  }

  if (normalized.includes('from detection_results') && normalized.includes('where request_id =')) {
    const res = fallbackDb.detection_results.get(params[0]);
    return mockResult(res ? [res] : []);
  }

  // 5. SCAM REPORTS
  if (normalized.startsWith('select * from scam_reports')) {
    const reports = Array.from(fallbackDb.scam_reports.values());
    return mockResult(reports);
  }

  if (normalized.startsWith('insert into scam_reports')) {
    const reportObj = {
      id: params[0],
      user_id: params[1],
      detection_request_id: params[2],
      category: params[3],
      description: params[4],
      phone_number: params[5],
      threat_severity: params[6] || 'medium',
      latitude: params[7],
      longitude: params[8],
      accuracy_meters: params[9],
      country: params[10] || 'India',
      region: params[11] || null,
      city: params[12] || null,
      evidence_files: typeof params[13] === 'string' ? JSON.parse(params[13]) : (params[13] || []),
      consent_given: params[14] || false,
      network_metadata: typeof params[15] === 'string' ? JSON.parse(params[15]) : (params[15] || {}),
      escalation_status: params[16] || 'Draft',
      law_enforcement_ref: params[17] || null,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
    };
    fallbackDb.scam_reports.set(reportObj.id, reportObj);

    // If coordinates present, add location event
    if (reportObj.latitude && reportObj.longitude) {
      fallbackDb.location_events.set(reportObj.id, {
        id: `loc_${reportObj.id}`,
        scam_report_id: reportObj.id,
        latitude: reportObj.latitude,
        longitude: reportObj.longitude,
        accuracy_meters: reportObj.accuracy_meters,
        country: reportObj.country,
        region: reportObj.region,
        city: reportObj.city,
        threat_level: reportObj.threat_severity,
        is_anonymized: true,
        created_at: new Date(),
      });
    }

    return mockResult([reportObj]);
  }

  // 6. LOCATION EVENTS / THREAT MAP
  if (normalized.includes('from location_events') || normalized.includes('from scam_reports where latitude is not null')) {
    const events = Array.from(fallbackDb.location_events.values());
    return mockResult(events);
  }

  // 7. AUDIT LOGS
  if (normalized.startsWith('insert into audit_logs')) {
    const logObj = {
      id: params[0],
      user_id: params[1],
      action: params[2],
      resource: params[3],
      resource_id: params[4],
      metadata_json: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
      ip_address: params[6],
      created_at: new Date(),
    };
    fallbackDb.audit_logs.set(logObj.id, logObj);
    return mockResult([logObj]);
  }

  // 8. INVESTIGATION CASES
  if (normalized.startsWith('select * from investigation_cases where case_id =')) {
    const caseId = params[0];
    const caseObj = fallbackDb.investigation_cases.get(caseId);
    return mockResult(caseObj ? [caseObj] : []);
  }

  if (normalized.startsWith('select * from investigation_cases')) {
    const cases = Array.from(fallbackDb.investigation_cases.values());
    return mockResult(cases);
  }

  if (normalized.startsWith('insert into investigation_cases')) {
    const caseObj = {
      case_id: params[0],
      incident_id: params[1],
      caller_identifier: params[2],
      session_id: params[3],
      timestamp: params[4],
      risk_score: params[5],
      voice_ai_probability: params[6],
      voice_clone_probability: params[7],
      fraud_indicators: typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8],
      status: params[9],
      investigator_id: params[10],
      authorization_reference: params[11],
      escalation_status: 'Draft',
      law_enforcement_ref: null,
      created_at: new Date(),
      updated_at: new Date(),
    };
    fallbackDb.investigation_cases.set(caseObj.case_id, caseObj);
    return mockResult([caseObj]);
  }

  if (normalized.startsWith('update investigation_cases set status =')) {
    const caseObj = fallbackDb.investigation_cases.get(params[2]);
    if (caseObj) {
      caseObj.status = params[0];
      if (params[1]) caseObj.investigator_id = params[1];
      caseObj.updated_at = new Date();
    }
    return mockResult(caseObj ? [caseObj] : []);
  }

  if (normalized.startsWith('update investigation_cases set escalation_status =')) {
    const caseObj = fallbackDb.investigation_cases.get(params[2]);
    if (caseObj) {
      caseObj.escalation_status = params[0];
      if (params[1]) caseObj.law_enforcement_ref = params[1];
      caseObj.updated_at = new Date();
    }
    return mockResult(caseObj ? [caseObj] : []);
  }

  // EVIDENCE
  if (normalized.startsWith('select * from evidence where case_id =')) {
    const evidence = Array.from(fallbackDb.evidence.values()).filter(e => e.case_id === params[0]);
    return mockResult(evidence);
  }

  if (normalized.startsWith('insert into evidence')) {
    const evObj = {
      evidence_id: params[0],
      case_id: params[1],
      source: params[2],
      timestamp: params[3],
      collector: params[4],
      authorization_reference: params[5],
      sha256_hash: params[6],
      mime_type: params[7],
      size_bytes: params[8],
      storage_reference: params[9],
      chain_of_custody_id: params[10],
      evidence_type: params[11],
      created_at: new Date()
    };
    fallbackDb.evidence.set(evObj.evidence_id, evObj);
    return mockResult([evObj]);
  }

  // CHAIN OF CUSTODY
  if (normalized.startsWith('select * from chain_of_custody where case_id =')) {
    const coc = Array.from(fallbackDb.chain_of_custody.values()).filter(c => c.case_id === params[0]);
    return mockResult(coc);
  }

  if (normalized.startsWith('insert into chain_of_custody')) {
    const cocObj = {
      id: params[0],
      case_id: params[1],
      evidence_id: params[2],
      action: params[3],
      actor_id: params[4],
      reason: params[5],
      authorization_reference: params[6],
      ip_address: params[7],
      metadata_json: typeof params[8] === 'string' ? JSON.parse(params[8]) : params[8],
      timestamp: params[9]
    };
    fallbackDb.chain_of_custody.set(cocObj.id, cocObj);
    return mockResult([cocObj]);
  }

  // 8. API USAGE
  if (normalized.startsWith('insert into api_usage')) {
    const usageObj = {
      id: params[0],
      user_id: params[1],
      endpoint: params[2],
      method: params[3],
      status_code: params[4],
      response_time_ms: params[5],
      request_size_bytes: params[6] || 0,
      ip_address: params[7],
      created_at: new Date(),
    };
    fallbackDb.api_usage.set(usageObj.id, usageObj);
    return mockResult([usageObj]);
  }

  // Default empty result
  return mockResult([]);
}
