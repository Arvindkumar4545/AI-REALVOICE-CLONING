import { query, fallbackDb, isUsingFallback } from '../database/index.js';
import { InvestigationCase, Evidence, ChainOfCustody } from './types.js';
import { v4 as uuidv4 } from 'uuid';

export class InvestigationRepository {
  static async createCase(caseData: Partial<InvestigationCase>): Promise<InvestigationCase> {
    const caseId = caseData.case_id || `cas_${uuidv4().replace(/-/g, '')}`;
    const timestamp = caseData.timestamp || new Date();
    
    const res = await query<InvestigationCase>(
      `INSERT INTO investigation_cases (
        case_id, incident_id, caller_identifier, session_id, timestamp,
        risk_score, voice_ai_probability, voice_clone_probability, fraud_indicators,
        status, investigator_id, authorization_reference
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        caseId,
        caseData.incident_id || null,
        caseData.caller_identifier || null,
        caseData.session_id || null,
        timestamp,
        caseData.risk_score || 0,
        caseData.voice_ai_probability || 0,
        caseData.voice_clone_probability || 0,
        JSON.stringify(caseData.fraud_indicators || []),
        caseData.status || 'OPEN',
        caseData.investigator_id || null,
        caseData.authorization_reference || null
      ]
    );
    return res.rows[0];
  }

  static async getCaseById(caseId: string): Promise<InvestigationCase | null> {
    const res = await query<InvestigationCase>(
      'SELECT * FROM investigation_cases WHERE case_id = $1 LIMIT 1',
      [caseId]
    );
    return res.rows[0] || null;
  }

  static async updateCaseStatus(caseId: string, status: string, investigatorId?: string): Promise<InvestigationCase | null> {
    const res = await query<InvestigationCase>(
      'UPDATE investigation_cases SET status = $1, investigator_id = COALESCE($2, investigator_id), updated_at = NOW() WHERE case_id = $3 RETURNING *',
      [status, investigatorId || null, caseId]
    );
    return res.rows[0] || null;
  }

  static async updateCaseEscalation(caseId: string, escalationStatus: string, lawEnforcementRef?: string): Promise<InvestigationCase | null> {
    const res = await query<InvestigationCase>(
      'UPDATE investigation_cases SET escalation_status = $1, law_enforcement_ref = COALESCE($2, law_enforcement_ref), updated_at = NOW() WHERE case_id = $3 RETURNING *',
      [escalationStatus, lawEnforcementRef || null, caseId]
    );
    return res.rows[0] || null;
  }

  static async getAllCases(limit: number = 50, offset: number = 0): Promise<{ cases: InvestigationCase[]; total: number }> {
    const res = await query<InvestigationCase>(
      'SELECT * FROM investigation_cases ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    
    let total = res.rows.length;
    if (!isUsingFallback()) {
        const countRes = await query('SELECT COUNT(*) FROM investigation_cases');
        total = parseInt(countRes.rows[0].count);
    }
    
    return { cases: res.rows, total };
  }

  static async getCasesByInvestigator(investigatorId: string): Promise<InvestigationCase[]> {
    const res = await query<InvestigationCase>(
      'SELECT * FROM investigation_cases WHERE investigator_id = $1 ORDER BY created_at DESC',
      [investigatorId]
    );
    return res.rows;
  }
}

export class EvidenceRepository {
  static async addEvidence(evidenceData: Partial<Evidence>): Promise<Evidence> {
    const evidenceId = evidenceData.evidence_id || `evd_${uuidv4().replace(/-/g, '')}`;
    const timestamp = evidenceData.timestamp || new Date();
    
    const res = await query<Evidence>(
      `INSERT INTO evidence (
        evidence_id, case_id, source, timestamp, collector, authorization_reference,
        sha256_hash, mime_type, size_bytes, storage_reference, chain_of_custody_id, evidence_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        evidenceId,
        evidenceData.case_id,
        evidenceData.source,
        timestamp,
        evidenceData.collector,
        evidenceData.authorization_reference || null,
        evidenceData.sha256_hash,
        evidenceData.mime_type,
        evidenceData.size_bytes,
        evidenceData.storage_reference,
        evidenceData.chain_of_custody_id,
        evidenceData.evidence_type
      ]
    );
    return res.rows[0];
  }

  static async getEvidenceByCase(caseId: string): Promise<Evidence[]> {
    const res = await query<Evidence>(
      'SELECT * FROM evidence WHERE case_id = $1 ORDER BY timestamp ASC',
      [caseId]
    );
    return res.rows;
  }
}

export class ChainOfCustodyRepository {
  static async logEvent(eventData: Partial<ChainOfCustody>): Promise<ChainOfCustody> {
    const eventId = eventData.id || `coc_${uuidv4().replace(/-/g, '')}`;
    const timestamp = eventData.timestamp || new Date();
    
    const res = await query<ChainOfCustody>(
      `INSERT INTO chain_of_custody (
        id, case_id, evidence_id, action, actor_id, reason,
        authorization_reference, ip_address, metadata_json, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        eventId,
        eventData.case_id,
        eventData.evidence_id || null,
        eventData.action,
        eventData.actor_id,
        eventData.reason,
        eventData.authorization_reference || null,
        eventData.ip_address || null,
        JSON.stringify(eventData.metadata_json || {}),
        timestamp
      ]
    );
    return res.rows[0];
  }

  static async getEventsByCase(caseId: string): Promise<ChainOfCustody[]> {
    const res = await query<ChainOfCustody>(
      'SELECT * FROM chain_of_custody WHERE case_id = $1 ORDER BY timestamp ASC',
      [caseId]
    );
    return res.rows;
  }
}
