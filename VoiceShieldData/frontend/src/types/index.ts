export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  role: 'user' | 'admin' | 'analyst';
  is_verified: boolean;
  api_key?: string | null;
  api_quota_daily?: number;
  api_usage_today?: number;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForensicMetrics {
  sample_rate?: number;
  duration_seconds?: number;
  channels?: number;
  rms_energy?: number;
  spectral_centroid_hz?: number;
  spectral_rolloff_hz?: number;
  zero_crossing_rate?: number;
  high_freq_energy_ratio?: number;
  silence_ratio?: number;
  clipping_ratio?: number;
  [key: string]: any;
}

export interface ExplainableSignal {
  category?: string;
  indicator?: string;
  description?: string;
  severity?: 'normal' | 'suspicious' | 'high_anomaly';
  score?: number;
  [key: string]: any;
}

export interface DetectionResult {
  id?: string;
  request_id?: string;
  user_id?: string | null;
  prediction: 'BONA_FIDE' | 'SPOOF' | 'UNCERTAIN' | 'SUSPICIOUS' | 'INSUFFICIENT_AUDIO' | string;
  confidence: number;
  risk_score: number;
  fraud_risk?: number;
  spoof_probability?: number;
  bona_fide_probability?: number;
  raw_probability?: number;
  processing_time_ms?: number;
  model_name?: string;
  model_version?: string;
  checkpoint_hash?: string;
  decision?: string;
  decision_reason?: string;
  windows_analyzed?: number;
  suspicious_windows?: number;
  model_agreement?: number;
  model_explanation_note?: string;
  forensics_json?: ForensicMetrics | Record<string, any>;
  explainability_json?: ExplainableSignal[] | Record<string, any>;
  created_at?: string;
  status?: string;
  classification?: string;
}

export interface DetectionRequestStatus {
  request_id: string;
  file_name: string;
  file_size_bytes: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string | null;
  created_at: string;
  result?: DetectionResult | null;
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
  status?: string;
  evidence_files?: any[];
  consent_given?: boolean;
  network_metadata?: Record<string, any>;
  escalation_status?: 'Draft' | 'Ready for Submission' | 'Submitted to Authority' | 'Case Reference Received' | 'Sent' | 'Acknowledged' | 'Under Review' | 'Action Taken';
  law_enforcement_ref?: string;
  created_at: string;
}

export interface ThreatLocationPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  country: string;
  region: string;
  city: string;
  threat_level: string;
  created_at: string;
}

export interface SystemStatistics {
  total_analyses: number;
  spoof_detected: number;
  bona_fide: number;
  average_confidence: number;
  average_risk_score: number;
  average_processing_time_ms: number;
  active_threat_events: number;
  model_name: string;
  model_version: string;
  system_status: string;
}

export interface AdminTelemetry {
  system: {
    uptime_seconds: number;
    node_version: string;
    platform: string;
    cpu_cores: number;
    memory_usage_percent: number;
    memory_free_mb: number;
    memory_total_mb: number;
  };
  telemetry: {
    total_users: number;
    queue_depth: number;
    ml_service_status: string;
    model_info: any;
    total_detections_24h?: number;
    spoof_detected_24h?: number;
    bona_fide_24h?: number;
    average_risk_score_24h?: number;
    total_reports_24h?: number;
  };
  recent_users: any[];
  recent_audit_logs: any[];
  recent_detections?: any[];
  recent_reports?: any[];
}
