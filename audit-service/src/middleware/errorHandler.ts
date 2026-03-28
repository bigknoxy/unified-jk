/**
 * Error Handler Middleware
 * Centralized error handling for the audit service
 */

import { Request, Response, NextFunction } from 'express';

interface ErrorWithStatus extends Error {
  status?: number;
  code?: string;
}

export function errorHandler(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  // Log error
  console.error('[AuditService] Error:', {
    status,
    message,
    code: err.code,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't leak error details in production
  res.status(status).json({
    error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isDevelopment ? message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
}
