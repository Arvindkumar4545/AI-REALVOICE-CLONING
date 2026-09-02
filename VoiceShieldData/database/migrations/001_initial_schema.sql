-- Migration: 001_initial_schema.sql
-- Applies initial VoiceShield tables and indices

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150),
    role VARCHAR(32) NOT NULL DEFAULT 'user',
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

CREATE TABLE IF NOT EXISTS detection_requests (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_hash_sha256 VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detection_results (
    id VARCHAR(64) PRIMARY KEY,
    request_id VARCHAR(64) UNIQUE NOT NULL REFERENCES detection_requests(request_id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    prediction VARCHAR(32) NOT NULL,
    confidence NUMERIC(5, 2) NOT NULL,
    risk_score NUMERIC(5, 2) NOT NULL,
    fraud_risk NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    spoof_probability NUMERIC(5, 2) NOT NULL,
    bona_fide_probability NUMERIC(5, 2) NOT NULL,
    raw_probability NUMERIC(7, 4) NOT NULL,
    processing_time_ms NUMERIC(8, 2) NOT NULL,
    model_name VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) NOT NULL,
    checkpoint_hash VARCHAR(64) NOT NULL,
    forensics_json TEXT NOT NULL DEFAULT '{}',
    explainability_json TEXT NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS scam_reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    detection_request_id VARCHAR(64) REFERENCES detection_requests(request_id) ON DELETE SET NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    phone_number VARCHAR(32),
    threat_severity VARCHAR(32) NOT NULL DEFAULT 'medium',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    accuracy_meters NUMERIC(8, 2),
    country VARCHAR(100) DEFAULT 'India',
    region VARCHAR(100),
    city VARCHAR(100),
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    resource VARCHAR(64) NOT NULL,
    resource_id VARCHAR(64),
    metadata_json TEXT DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
