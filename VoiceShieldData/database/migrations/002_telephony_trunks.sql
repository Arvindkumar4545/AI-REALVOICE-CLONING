-- ============================================================================
-- MIGRATION 002: TELEPHONY TRUNKS TABLE
-- ============================================================================

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
