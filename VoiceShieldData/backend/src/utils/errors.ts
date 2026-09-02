/**
 * Custom Application Errors
 * Provides structured error handling with proper codes and messages
 */

export interface ErrorContext {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, any>;
}

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, any>;

  constructor(message: string, code: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Invalid or expired access token') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = `${resource}${id ? ` with id "${id}"` : ''} not found`;
    super(message, 'NOT_FOUND', 404);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class AudioProcessingError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'AUDIO_PROCESSING_ERROR', 400, details);
    Object.setPrototypeOf(this, AudioProcessingError.prototype);
  }
}

export class UnsupportedAudioFormatError extends AudioProcessingError {
  constructor(format: string) {
    super(`Unsupported audio format: ${format}`, { format });
    this.code = 'UNSUPPORTED_AUDIO_FORMAT';
    Object.setPrototypeOf(this, UnsupportedAudioFormatError.prototype);
  }
}

export class AudioFileTooLargeError extends AudioProcessingError {
  constructor(sizeMB: number, maxMB: number) {
    super(`Audio file is ${sizeMB}MB, exceeds maximum of ${maxMB}MB`, { sizeMB, maxMB });
    this.code = 'AUDIO_FILE_TOO_LARGE';
    Object.setPrototypeOf(this, AudioFileTooLargeError.prototype);
  }
}

export class MLServiceError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'ML_SERVICE_ERROR', 503, details);
    Object.setPrototypeOf(this, MLServiceError.prototype);
  }
}

export class MLInferenceError extends MLServiceError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, details);
    this.code = 'ML_INFERENCE_ERROR';
    Object.setPrototypeOf(this, MLInferenceError.prototype);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, statusCode: number, message?: string) {
    super(
      message || `External service "${service}" returned error`,
      'EXTERNAL_SERVICE_ERROR',
      statusCode
    );
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}
