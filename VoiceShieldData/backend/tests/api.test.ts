import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { initDatabase } from '../src/database/index.js';
import path from 'path';
import fs from 'fs';

vi.mock('../src/services/mlService.js', () => ({
  mlService: {
    getHealth: vi.fn().mockResolvedValue({ status: 'healthy', version: '1.0' }),
    predict: vi.fn().mockResolvedValue({
      success: true,
      request_id: 'req_mock',
      filename: 'test.wav',
      file_size_bytes: 1000,
      prediction: 'BONA_FIDE',
      confidence: 95,
      risk_score: 10,
      fraud_risk: 10,
      spoof_probability: 5,
      bona_fide_probability: 95,
      raw_probability: 0.05,
      processing_time_ms: 100,
      model_name: 'AudioSpoofNet',
      model_version: 'v1.0.0',
      checkpoint_hash: 'mockhash',
      forensics: {},
      explainability: [],
    }),
  }
}));

const app = createApp();

beforeAll(async () => {
  await initDatabase();
});

describe('VoiceShield Backend API Test Suite', () => {
  let authToken = '';
  let adminToken = '';
  let testUserId = '';
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  // 1. Health Checks
  describe('Health Endpoints', () => {
    it('GET /health should return 200 OK and operational status in degraded mode', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.service).toBe('VoiceShield API Gateway');
      expect(res.body.dependencies.database.mode).toBe('embedded_resilient_store');
    });

    it('GET /api/v1/health should return version and queue depth', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
      expect(res.body).toHaveProperty('queue_depth');
      expect(res.body.status).toBe('degraded');
    });

    it('GET /api/v1/health should stay operational in degraded mode', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.dependencies.database.mode).toBe('embedded_resilient_store');
      expect(res.body.dependencies.ml_service.status).toBe('healthy');
    });
  });

  // 2. Authentication Flow
  describe('Authentication Flow', () => {
    it('POST /api/v1/auth/signup should create a new user and return JWT tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
          full_name: 'Test Investigator',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.tokens).toHaveProperty('access_token');
      expect(res.body.data.tokens).toHaveProperty('refresh_token');

      authToken = res.body.data.tokens.access_token;
      testUserId = res.body.data.user.id;
    });

    it('POST /api/v1/auth/signup should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_EXISTS');
    });

    it('POST /api/v1/auth/signin should authenticate valid user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tokens).toHaveProperty('access_token');
    });

    it('POST /api/v1/auth/signin should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/signin')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('GET /api/v1/auth/me should return authenticated user profile', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testUserId);
      expect(res.body.data.email).toBe(testEmail);
    });
  });

  // 3. Statistics & Public Endpoints
  describe('Statistics & Intelligence', () => {
    it('GET /api/v1/statistics should return real aggregate counts', async () => {
      const res = await request(app).get('/api/v1/statistics');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total_analyses');
      expect(res.body.data).toHaveProperty('spoof_detected');
      expect(res.body.data).toHaveProperty('bona_fide');
    });

    it('GET /api/v1/location/threats should return aggregated threat coordinates', async () => {
      const res = await request(app).get('/api/v1/location/threats');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.points)).toBe(true);
    });
  });

  // 4. Scam Reporting Flow
  describe('Scam Reports', () => {
    it('POST /api/v1/reports should create a new scam report with location', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'BANK_IMPERSONATION',
          description: 'Received robotic voice call asking for OTP and bank account access.',
          phone_number: '+91-9876543210',
          threat_severity: 'high',
          latitude: 28.6139,
          longitude: 77.2090,
          accuracy_meters: 15.5,
          country: 'India',
          region: 'Delhi',
          city: 'New Delhi',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('BANK_IMPERSONATION');
      expect(res.body.data.threat_severity).toBe('high');
    });

    it('POST /api/v1/reports should accept the executive-fraud category contract used by operators', async () => {
      const res = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'CEO_FRAUD',
          description: 'Executive impersonation attempt asked for urgent account transfer approval.',
          phone_number: '+1-415-555-0192',
          threat_severity: 'critical',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.category).toBe('CEO_FRAUD');
    });

    it('GET /api/v1/reports should return masked phone numbers in list', async () => {
      const res = await request(app).get('/api/v1/reports');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);
      const first = res.body.data.items[0];
      if (first.phone_number) {
        expect(first.phone_number).toContain('****');
      }
    });
  });

  // 5. Detection Upload & History Flow
  describe('Detection & Upload Flow', () => {
    it('POST /api/v1/detection should reject missing audio file', async () => {
      const res = await request(app)
        .post('/api/v1/detection')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/v1/detection should accept valid audio upload and enqueue request', async () => {
      // Create a small test wav file
      const tempWav = path.join(process.cwd(), 'test_temp.wav');
      fs.writeFileSync(tempWav, Buffer.alloc(44, 0)); // Minimal mock header

      const res = await request(app)
        .post('/api/v1/detection')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('audio', tempWav);

      expect([200, 202]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('request_id');

      // Cleanup
      try {
        fs.unlinkSync(tempWav);
      } catch {}
    });

    it('GET /api/v1/history should return paginated history', async () => {
      const res = await request(app)
        .get('/api/v1/history')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('items');
      expect(res.body.data).toHaveProperty('pagination');
    });
  });

  // 6. Admin Authorization Guard
  describe('Admin Authorization', () => {
    it('GET /api/v1/admin/overview should reject non-admin users with 403', async () => {
      const res = await request(app)
        .get('/api/v1/admin/overview')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });
});
