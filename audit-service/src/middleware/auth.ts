/**
 * Authentication Middleware
 * Verifies requests come from the Shell Platform
 */

import { Request, Response, NextFunction } from 'express';

// In production, use proper authentication (JWT, API keys, etc.)
const API_KEYS = process.env.API_KEYS?.split(',') || ['dev-key-123'];
const SHELL_ORIGINS = process.env.SHELL_ORIGINS?.split(',') || ['http://localhost:8888'];

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Simple API key authentication
 * Production should use JWT or mTLS
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip auth in development for health checks
  if (req.path === '/health' || req.path.startsWith('/health/')) {
    return next();
  }

  // Check Origin header
  const origin = req.headers.origin;
  if (origin && SHELL_ORIGINS.includes(origin)) {
    // Origin is from shell - allow
    req.user = { id: 'shell', role: 'service' };
    return next();
  }

  // Check API key
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key or invalid origin'
    });
    return;
  }

  if (!API_KEYS.includes(apiKey as string)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
    return;
  }

  req.user = { id: 'api', role: 'service' };
  next();
}
