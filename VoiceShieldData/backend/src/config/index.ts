import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '0.0.0.0',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'voiceshield-jwt-super-secure-production-secret-2026',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'voiceshield-refresh-super-secure-production-secret-2026',
    accessExpiry: '15m',
    refreshExpiry: '7d',
  },
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/voiceshield',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    enabled: process.env.REDIS_ENABLED === 'true',
  },
  
  mlService: {
    url: process.env.ML_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://voiceshield-ml.onrender.com' : 'http://127.0.0.1:8000'),
    timeoutMs: parseInt(process.env.ML_TIMEOUT_MS || '30000', 10),
    retries: 2,
  },
  
  storage: {
    uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    retentionDays: parseInt(process.env.AUDIO_RETENTION_DAYS || '30', 10),
  },
  
  rateLimit: {
    globalMax: parseInt(process.env.RATE_LIMIT_GLOBAL || '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH || '20', 10),
    detectionMax: parseInt(process.env.RATE_LIMIT_DETECTION || '30', 10),
  },
  
  security: {
    saltRounds: 12,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 15,
  }
};
