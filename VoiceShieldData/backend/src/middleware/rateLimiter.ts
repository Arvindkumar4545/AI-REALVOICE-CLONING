import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.globalMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please slow down and try again.',
    },
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts. Please try again later.',
    },
  },
});

export const detectionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimit.detectionMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'DETECTION_RATE_LIMIT_EXCEEDED',
      message: 'Detection quota exceeded. Maximum rate is 30 requests per minute.',
    },
  },
});
