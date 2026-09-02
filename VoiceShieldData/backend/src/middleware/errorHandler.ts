import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).requestId || req.headers['x-request-id'] || 'unknown';
  
  let statusCode = err.status || err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected internal error occurred';
  let details = err.details || undefined;

  if (err instanceof multer.MulterError) {
    statusCode = 400;
    code = 'FILE_UPLOAD_ERROR';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Audio file exceeds the maximum 50MB size limit.';
      code = 'AUDIO_TOO_LARGE';
    }
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    // Format Zod errors into field-specific messages for better frontend UX
    details = err.errors.map((e: any) => ({
      field: e.path?.join('.') || 'unknown',
      message: e.message,
      code: e.code,
    }));
  } else if (err.message && err.message.includes('Unsupported audio format')) {
    statusCode = 400;
    code = 'UNSUPPORTED_AUDIO_FORMAT';
  } else if (err.response?.data?.error) {
    statusCode = err.response.status || 400;
    code = err.response.data.error.code || 'ML_SERVICE_ERROR';
    message = err.response.data.error.message || err.response.data.detail || message;
    details = err.response.data.error.details || err.response.data;
  } else if (err.response?.data?.detail) {
    statusCode = err.response.status || 400;
    code = 'ML_INFERENCE_ERROR';
    message = String(err.response.data.detail);
  }

  if (String(message).toUpperCase().includes('ML_INVALID_RESPONSE')) {
    statusCode = 502;
    code = 'ML_INVALID_RESPONSE';
    message = 'The analysis service returned an invalid result.';
  }

  // Never expose sensitive internal stack traces in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An internal server error occurred. Please contact security support.';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
    request_id: requestId,
  });
}
