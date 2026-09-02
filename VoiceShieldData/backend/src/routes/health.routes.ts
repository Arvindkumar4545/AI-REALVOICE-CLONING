import { Router, Request, Response } from 'express';
import { isUsingFallback, getPool } from '../database/index.js';
import { getQueueDepth } from '../queue/index.js';
import { mlService } from '../services/mlService.js';
import { config } from '../config/index.js';
import Redis from 'ioredis';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  timestamp: string;
  uptime_ms: number;
  dependencies: {
    database: { status: string; mode: string };
    redis: { status: string; enabled: boolean };
    ml_service: { status: string; url: string };
    queue: { status: string; depth: number };
  };
}

const startTime = Date.now();

router.get('/', async (req: Request, res: Response) => {
  try {
    const dbStatus = isUsingFallback() ? 'degraded' : 'healthy';
    const queueDepth = getQueueDepth();

    // Check ML Service health
    let mlServiceStatus = 'unhealthy';
    try {
      await mlService.getHealth();
      mlServiceStatus = 'healthy';
    } catch (e) {
      mlServiceStatus = 'unreachable';
    }

    // Check Redis if enabled
    let redisStatus = 'disabled';
    if (config.redis.enabled) {
      try {
        const redisClient = new Redis(config.redis.url, { connectTimeout: 2000 });
        await redisClient.ping();
        redisStatus = 'healthy';
        await redisClient.disconnect();
      } catch (e) {
        redisStatus = 'unhealthy';
      }
    }

    const hasCriticalFailure = mlServiceStatus === 'unreachable' || mlServiceStatus === 'unhealthy';
    const overallStatus = hasCriticalFailure ? 'unhealthy' : (dbStatus === 'healthy' && mlServiceStatus === 'healthy' ? 'healthy' : 'degraded');

    const response: HealthStatus & { queue_depth: number } = {
      status: overallStatus,
      service: 'VoiceShield API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - startTime,
      queue_depth: queueDepth,
      dependencies: {
        database: {
          status: dbStatus,
          mode: isUsingFallback() ? 'embedded_resilient_store' : 'postgresql',
        },
        redis: {
          status: redisStatus,
          enabled: config.redis.enabled,
        },
        ml_service: {
          status: mlServiceStatus,
          url: config.mlService.url,
        },
        queue: {
          status: 'healthy',
          depth: queueDepth,
        },
      },
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    res.status(statusCode).json(response);
  } catch (err: any) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'VoiceShield API Gateway',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

router.get('/ready', async (req: Request, res: Response) => {
  try {
    const pool = getPool();
    const isReady = pool !== null && !isUsingFallback();

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(503).json({ status: 'not_ready' });
  }
});

router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

export default router;
