import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/index.js';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || `req_${uuidv4().replace(/-/g, '')}`;
  (req as any).requestId = reqId;
  res.setHeader('X-Request-ID', reqId);

  const start = Date.now();

  res.on('finish', () => {
    const elapsed = Date.now() - start;
    const userId = (req as any).user?.id || null;

    // Async record api_usage
    query(
      `INSERT INTO api_usage (id, user_id, endpoint, method, status_code, response_time_ms, request_size_bytes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `api_${uuidv4().replace(/-/g, '')}`,
        userId,
        req.originalUrl || req.url,
        req.method,
        res.statusCode,
        elapsed,
        req.socket.bytesRead || 0,
        req.ip || req.socket.remoteAddress || 'unknown',
      ]
    ).catch(() => {});
  });

  next();
}
