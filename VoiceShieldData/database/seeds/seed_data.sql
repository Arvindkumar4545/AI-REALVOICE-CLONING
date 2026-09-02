-- Initial Seed Data for VoiceShield
-- Creates default demo admin user (password: Admin@VoiceShield2026!)
-- Hash generated with bcrypt salt rounds 12: $2a$12$K8yM5aXFz87E1i8yGsmx.OTxZ90Jc8PzY.H7b6o3iL9P.hVjKjWq.

INSERT INTO users (
    id, email, password_hash, full_name, role, is_verified, api_key, created_at, updated_at
) VALUES (
    'usr_admin_default_01',
    'admin@voiceshield.ai',
    '$2a$12$864YkQo22e.lK7u75wO8b.e0oG6bZJtDkWvGq0U1t8Pz0wL1t2V8e',
    'Security Officer',
    'admin',
    TRUE,
    'vsh_live_8f7b2c9a1d4e6f3b0c5a7e9d2f4b6a8c',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
