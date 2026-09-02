/**
 * Structured Logging Service
 * Provides consistent, JSON-formatted logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  request_id?: string;
  user_id?: string;
  duration_ms?: number;
  status_code?: number;
  error?: string;
  stack?: string;
  data?: Record<string, any>;
}

class Logger {
  private serviceName = 'VoiceShield';

  private formatEntry(level: LogLevel, message: string, context?: any): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
    };

    if (context) {
      if (context.requestId) entry.request_id = context.requestId;
      if (context.userId) entry.user_id = context.userId;
      if (context.durationMs) entry.duration_ms = context.durationMs;
      if (context.statusCode) entry.status_code = context.statusCode;
      if (context.error) entry.error = context.error;
      if (context.stack) entry.stack = context.stack;
      if (context.data) entry.data = context.data;
    }

    return entry;
  }

  private log(level: LogLevel, message: string, context?: any): void {
    const entry = this.formatEntry(level, message, context);
    const output = JSON.stringify(entry);

    switch (level) {
      case 'debug':
        if (process.env.NODE_ENV === 'development') console.log(output);
        break;
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'fatal':
        console.error(output);
        break;
    }
  }

  debug(message: string, context?: any): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: any): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: any): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: any): void {
    this.log('error', message, context);
  }

  fatal(message: string, context?: any): void {
    this.log('fatal', message, context);
    process.exit(1);
  }

  /**
   * Log HTTP request completion with duration
   */
  logRequest(
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    userId?: string
  ): void {
    this.info(`${method} ${path} - ${statusCode}`, {
      requestId,
      userId,
      statusCode,
      durationMs,
      data: { method, path },
    });
  }

  /**
   * Log API call to external service
   */
  logExternalCall(
    requestId: string,
    service: string,
    endpoint: string,
    statusCode: number,
    durationMs: number
  ): void {
    this.info(`External call to ${service}: ${endpoint} - ${statusCode}`, {
      requestId,
      statusCode,
      durationMs,
      data: { service, endpoint },
    });
  }

  /**
   * Log database query
   */
  logDatabaseQuery(requestId: string, query: string, durationMs: number, rowCount?: number): void {
    if (process.env.NODE_ENV === 'development') {
      this.debug(`Database query executed in ${durationMs}ms`, {
        requestId,
        durationMs,
        data: { query, rows: rowCount },
      });
    }
  }

  /**
   * Log job processing
   */
  logJobProcessing(
    requestId: string,
    jobId: string,
    status: 'started' | 'completed' | 'failed',
    durationMs?: number,
    error?: string
  ): void {
    const level = status === 'failed' ? 'error' : 'info';
    this.log(level, `Job ${jobId}: ${status}`, {
      requestId,
      durationMs,
      error,
      data: { jobId, status },
    });
  }

  /**
   * Log inference result
   */
  logInference(
    requestId: string,
    prediction: string,
    confidence: number,
    durationMs: number
  ): void {
    this.info(`AI Inference completed: ${prediction} (${(confidence * 100).toFixed(1)}%)`, {
      requestId,
      durationMs,
      data: { prediction, confidence: (confidence * 100).toFixed(1) + '%' },
    });
  }
}

export const logger = new Logger();
