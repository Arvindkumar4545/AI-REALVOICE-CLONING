export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name?: string | null;
  role: 'user' | 'admin' | 'analyst' | 'investigator' | 'law_enforcement';
  is_verified: boolean;
  verification_token?: string | null;
  reset_password_token?: string | null;
  reset_password_expires_at?: Date | null;
  failed_login_attempts: number;
  lockout_until?: Date | null;
  api_key?: string | null;
  api_quota_daily: number;
  api_usage_today: number;
  created_at: Date;
  updated_at: Date;
}

export interface Session {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  user_agent?: string | null;
  ip_address?: string | null;
  is_revoked: boolean;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DetectionRequest {
  id: string;
  request_id: string;
  user_id?: string | null;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  file_hash_sha256?: string | null;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ForensicMetrics {
  sample_rate: number;
  duration_seconds: number;
  channels: number;
  rms_energy: number;
  spectral_centroid_hz: number;
  spectral_rolloff_hz: number;
  zero_crossing_rate: number;
  high_freq_energy_ratio: number;
  silence_ratio: number;
  clipping_ratio: number;
}

export interface ExplainableSignal {
  category: string;
  indicator: string;
  description: string;
  severity: 'normal' | 'suspicious' | 'high_anomaly';
  score: number;
}

export interface DetectionResult {
  id: string;
  request_id: string;
  user_id?: string | null;
  prediction: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'INSUFFICIENT_AUDIO' | string;
  confidence: number;
  risk_score: number;
  fraud_risk?: number;
  spoof_probability: number;
  bona_fide_probability: number;
  raw_probability: number;
  processing_time_ms: number;
  model_name: string;
  model_version: string;
  checkpoint_hash: string;
  forensics_json: ForensicMetrics | Record<string, any>;
  explainability_json: ExplainableSignal[] | Record<string, any>[];
  created_at: Date;
}

export interface AudioMetadata {
  id: string;
  request_id: string;
  duration_seconds?: number | null;
  sample_rate?: number | null;
  channels?: number | null;
  format?: string | null;
  bit_depth?: number | null;
  storage_path?: string | null;
  is_deleted: boolean;
  deleted_at?: Date | null;
  created_at: Date;
}

export interface ScamReport {
  id: string;
  user_id?: string | null;
  detection_request_id?: string | null;
  category: 'IRS_TAX' | 'BANK_IMPERSONATION' | 'FAMILY_EMERGENCY' | 'CEO_FRAUD' | 'TECH_SUPPORT' | 'TELEMARKETING' | 'OTHER';
  description: string;
  phone_number?: string | null;
  threat_severity: 'low' | 'medium' | 'high' | 'critical';
  latitude?: number | null;
  longitude?: number | null;
  accuracy_meters?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  status: 'pending' | 'verified' | 'dismissed';
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface LocationEvent {
  id: string;
  scam_report_id?: string | null;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  threat_level: string;
  is_anonymized: boolean;
  created_at: Date;
}

export interface ApiUsage {
  id: string;
  user_id?: string | null;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  request_size_bytes: number;
  ip_address?: string | null;
  created_at: Date;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  resource: string;
  resource_id?: string | null;
  metadata_json?: Record<string, any>;
  ip_address?: string | null;
  created_at: Date;
}

export interface InvestigationCase {
  case_id: string;
  incident_id?: string | null;
  caller_identifier?: string | null;
  session_id?: string | null;
  timestamp: Date;
  risk_score: number;
  voice_ai_probability: number;
  voice_clone_probability: number;
  fraud_indicators: string[];
  status: 'OPEN' | 'IN_PROGRESS' | 'CLOSED' | 'ESCALATED';
  investigator_id?: string | null;
  authorization_reference?: string | null;
  escalation_status?: 'Draft' | 'Ready for Submission' | 'Submitted to Authority' | 'Case Reference Received' | 'Sent' | 'Acknowledged' | 'Under Review' | 'Action Taken';
  law_enforcement_ref?: string | null;
  network_metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface Evidence {
  evidence_id: string;
  case_id: string;
  source: string;
  timestamp: Date;
  collector: string;
  authorization_reference?: string | null;
  sha256_hash: string;
  mime_type: string;
  size_bytes: number;
  storage_reference: string;
  chain_of_custody_id: string;
  evidence_type: 'AUDIO' | 'VIDEO' | 'IMAGE' | 'LOCATION' | 'CALL_METADATA' | 'NETWORK_METADATA' | 'DEVICE_METADATA' | 'DOCUMENT' | 'ML_ANALYSIS';
  created_at: Date;
}

export interface ChainOfCustody {
  id: string;
  case_id: string;
  evidence_id?: string | null;
  action: 'EVIDENCE_CREATED' | 'HASH_VERIFIED' | 'EXPORT' | 'INVESTIGATOR_ACCESS' | 'STATUS_CHANGED';
  actor_id: string;
  reason: string;
  authorization_reference?: string | null;
  ip_address?: string | null;
  metadata_json?: Record<string, any>;
  timestamp: Date;
}
