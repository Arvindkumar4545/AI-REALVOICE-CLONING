-- ============================================================================
-- VOICE SHIELD — PRODUCTION DATABASE SCHEMA (PostgreSQL)
-- ============================================================================

-- Enable UUID extension if supported
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(32) NOT NULL DEFAULT 'user', -- 'user' | 'admin' | 'analyst'
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_password_token VARCHAR(255),
    reset_password_expires_at TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    api_key VARCHAR(128) UNIQUE,
    api_quota_daily INT NOT NULL DEFAULT 500,
    api_usage_today INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);

-- ----------------------------------------------------------------------------
-- 2. SESSIONS TABLE (Refresh Token Rotation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(45),
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(refresh_token_hash);

-- ----------------------------------------------------------------------------
-- 3. DETECTION REQUESTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detection_requests (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash_sha256 VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'queued', -- 'queued' | 'processing' | 'completed' | 'failed'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_req_user_id ON detection_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_detection_req_request_id ON detection_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_detection_req_status ON detection_requests(status);
CREATE INDEX IF NOT EXISTS idx_detection_req_created_at ON detection_requests(created_at DESC);

-- ----------------------------------------------------------------------------
-- 4. DETECTION RESULTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS detection_results (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL REFERENCES detection_requests(request_id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    prediction VARCHAR(32) NOT NULL, -- 'BONA_FIDE' | 'SPOOF'
    confidence NUMERIC(5, 2) NOT NULL, -- 0.00 to 100.00
    risk_score NUMERIC(5, 2) NOT NULL, -- 0.00 to 100.00 (voice authenticity risk)
    fraud_risk NUMERIC(5, 2) NOT NULL DEFAULT 0.00, -- 0.00 to 100.00 (independent fraud-risk layer)
    spoof_probability NUMERIC(5, 2) NOT NULL,
    bona_fide_probability NUMERIC(5, 2) NOT NULL,
    raw_probability NUMERIC(7, 4) NOT NULL,
    processing_time_ms NUMERIC(8, 2) NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) NOT NULL,
    checkpoint_hash VARCHAR(64) NOT NULL,
    forensics_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    explainability_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_detection_res_request_id ON detection_results(request_id);
CREATE INDEX IF NOT EXISTS idx_detection_res_prediction ON detection_results(prediction);
CREATE INDEX IF NOT EXISTS idx_detection_res_risk_score ON detection_results(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_detection_res_user_id ON detection_results(user_id);
CREATE INDEX IF NOT EXISTS idx_detection_res_created_at ON detection_results(created_at DESC);

-- ----------------------------------------------------------------------------
-- 5. AUDIO METADATA TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audio_metadata (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL REFERENCES detection_requests(request_id) ON DELETE CASCADE,
    duration_seconds NUMERIC(6, 3),
    sample_rate INT,
    channels INT,
    format VARCHAR(32),
    bit_depth INT,
    storage_path VARCHAR(500),
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audio_meta_request_id ON audio_metadata(request_id);

-- ----------------------------------------------------------------------------
-- 6. SCAM REPORTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scam_reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    detection_request_id VARCHAR(64) REFERENCES detection_requests(request_id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL, -- 'IRS_TAX', 'BANK_IMPERSONATION', 'FAMILY_EMERGENCY', 'CEO_FRAUD', 'TECH_SUPPORT', 'TELEMARKETING', 'OTHER'
    description TEXT NOT NULL,
    phone_number VARCHAR(32),
    threat_severity VARCHAR(32) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy_meters NUMERIC(8, 2),
    country VARCHAR(100) DEFAULT 'India',
    region VARCHAR(100),
    city VARCHAR(100),
    status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'verified' | 'dismissed'
    notes TEXT,
    evidence_files JSONB DEFAULT '[]'::jsonb,
    consent_given BOOLEAN NOT NULL DEFAULT FALSE,
    network_metadata JSONB DEFAULT '{}'::jsonb,
    escalation_status VARCHAR(64) NOT NULL DEFAULT 'Draft',
    law_enforcement_ref VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scam_reports_category ON scam_reports(category);
CREATE INDEX IF NOT EXISTS idx_scam_reports_threat_severity ON scam_reports(threat_severity);
CREATE INDEX IF NOT EXISTS idx_scam_reports_created_at ON scam_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scam_reports_location ON scam_reports(country, region, city);

-- ----------------------------------------------------------------------------
-- 7. LOCATION EVENTS TABLE (Anonymized Threat Aggregation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS location_events (
    id VARCHAR(64) PRIMARY KEY,
    scam_report_id VARCHAR(64) REFERENCES scam_reports(id) ON DELETE CASCADE,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    accuracy_meters NUMERIC(8, 2),
    country VARCHAR(100) DEFAULT 'India',
    region VARCHAR(100),
    city VARCHAR(100),
    threat_level VARCHAR(32) NOT NULL DEFAULT 'medium',
    is_anonymized BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_location_events_coords ON location_events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_location_events_country ON location_events(country);
CREATE INDEX IF NOT EXISTS idx_location_events_created_at ON location_events(created_at DESC);

-- ----------------------------------------------------------------------------
-- 8. API USAGE TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_usage (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(16) NOT NULL,
    status_code INT NOT NULL,
    response_time_ms NUMERIC(8, 2) NOT NULL,
    request_size_bytes BIGINT NOT NULL DEFAULT 0,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- ----------------------------------------------------------------------------
-- 9. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    metadata_json JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ----------------------------------------------------------------------------
-- 10. TELEPHONY TRUNKS TABLE (EPABX / SIPREC Ingestion)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telephony_trunks (
    id VARCHAR(64) PRIMARY KEY,
    trunk_name VARCHAR(150) NOT NULL,
    protocol VARCHAR(32) NOT NULL DEFAULT 'SIPREC', -- 'SIPREC' | 'SIP' | 'WEBSOCKET' | 'RTP'
    host_address VARCHAR(255) NOT NULL,
    port INT NOT NULL DEFAULT 5060,
    transport VARCHAR(16) NOT NULL DEFAULT 'TLS', -- 'UDP' | 'TCP' | 'TLS'
    codec VARCHAR(32) NOT NULL DEFAULT 'G.711u',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE' | 'STANDBY' | 'DEGRADED' | 'OFFLINE'
    active_channels INT NOT NULL DEFAULT 0,
    max_channels INT NOT NULL DEFAULT 100,
    carrier VARCHAR(100) DEFAULT 'Tata Teleservices / Enterprise SIP',
    last_ping TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telephony_trunks_status ON telephony_trunks(status);
CREATE INDEX IF NOT EXISTS idx_telephony_trunks_protocol ON telephony_trunks(protocol);

-- ----------------------------------------------------------------------------
-- 11. CALLER THREAT PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS caller_threat_profiles (
    id VARCHAR(64) PRIMARY KEY,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    trust_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
    risk_level VARCHAR(32) NOT NULL DEFAULT 'WATCH', -- 'CRITICAL' | 'DANGER' | 'WATCH' | 'SAFE'
    voice_dna_match NUMERIC(5, 2),
    total_reports INT NOT NULL DEFAULT 0,
    carrier VARCHAR(150),
    network_type VARCHAR(64),
    origin_country VARCHAR(100),
    origin_city VARCHAR(100),
    is_spoofed BOOLEAN NOT NULL DEFAULT FALSE,
    stir_shaken_status VARCHAR(64) DEFAULT 'NOT_CHECKED',
    is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
    categories JSONB DEFAULT '[]'::jsonb,
    community_tags JSONB DEFAULT '[]'::jsonb,
    telemetry_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_caller_phone ON caller_threat_profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_caller_risk ON caller_threat_profiles(risk_level);
CREATE INDEX IF NOT EXISTS idx_caller_blocked ON caller_threat_profiles(is_blocked);

-- ----------------------------------------------------------------------------
-- 12. VISHING THREAT TRIGGERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vishing_threat_triggers (
    id VARCHAR(64) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    caller_phone VARCHAR(32),
    trigger_keyword VARCHAR(100) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'OTP_DEMAND' | 'DIGITAL_ARREST' | 'BANK_IMPERSONATION' | 'URGENCY'
    confidence NUMERIC(5, 2) NOT NULL,
    transcript_snippet TEXT,
    timestamp_offset_ms INT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vishing_session ON vishing_threat_triggers(session_id);
CREATE INDEX IF NOT EXISTS idx_vishing_category ON vishing_threat_triggers(category);

-- ----------------------------------------------------------------------------
-- 13. EVIDENCE VAULT HASHES TABLE (Tamper-Evident Judicial Custody)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidence_vault_hashes (
    id VARCHAR(64) PRIMARY KEY,
    evidence_id VARCHAR(64) UNIQUE NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    digital_signature TEXT,
    blockchain_tx_receipt VARCHAR(128),
    chain_of_custody_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evidence_hash ON evidence_vault_hashes(sha256_hash);
CREATE INDEX IF NOT EXISTS idx_evidence_id ON evidence_vault_hashes(evidence_id);
