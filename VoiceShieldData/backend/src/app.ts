import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { requestIdMiddleware } from './middleware/audit.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import detectionRoutes from './routes/detection.routes.js';
import historyRoutes from './routes/history.routes.js';
import reportRoutes from './routes/report.routes.js';
import locationRoutes from './routes/location.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';
import adminRoutes from './routes/admin.routes.js';
import userRoutes from './routes/user.routes.js';
import healthRoutes from './routes/health.routes.js';
import investigationRoutes from './routes/investigation.routes.js';

export function createApp(): Express {
  const app = express();

  // Security Headers & CORS
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  app.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Observability & Rate Limiting
  app.use(requestIdMiddleware);
  app.use(globalLimiter);

  // API v1 Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/detection', detectionRoutes);
  app.use('/api/v1/history', historyRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/location', locationRoutes);
  app.use('/api/v1/statistics', statisticsRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/user', userRoutes);
  app.use('/api/v1/health', healthRoutes);
  app.use('/api/v1/investigation', investigationRoutes);

  // Root & Health Probes
  app.use('/health', healthRoutes);
  app.use('/ready', healthRoutes);
  app.use('/live', healthRoutes);

  app.get('/', (req, res) => {
    res.json({
      name: 'VoiceShield API Gateway',
      version: '1.0.0',
      description: 'Production-grade AI Voice Scam & Deepfake Detection Platform',
      endpoints: {
        auth: '/api/v1/auth',
        detection: '/api/v1/detection',
        history: '/api/v1/history',
        reports: '/api/v1/reports',
        location: '/api/v1/location',
        statistics: '/api/v1/statistics',
        admin: '/api/v1/admin',
        health: '/api/v1/health',
      },
    });
  });

  // 404 Route Handler
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
      },
      request_id: (req as any).requestId,
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
