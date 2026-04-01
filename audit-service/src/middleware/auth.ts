/**
 * Authentication Middleware
 * Verifies requests come from the Shell Platform
 */

import { Request, Response, NextFunction } from 'express';

// In production, use proper authentication (JWT, API keys, etc.)
const API_KEYS = process.env.API_KEYS?.split(',') || ['dev-key-123'];
const SHELL_ORIGINS = process.env.SHELL_ORIGINS?.split(',') || ['http://localhost:8888'];

function isLocalRequest(req: Request): boolean {
  const ip = req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

function hasValidApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  return !!apiKey && API_KEYS.includes(apiKey as string);
}

function isTrustedShellRequest(req: Request): boolean {
  const origin = req.headers.origin;
  return !!origin && SHELL_ORIGINS.includes(origin) && isLocalRequest(req);
}

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

  if (isTrustedShellRequest(req)) {
    // Origin is from shell - allow
    req.user = { id: 'shell', role: 'service' };
    return next();
  }

  // Check API key
  if (!hasValidApiKey(req)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid API key'
    });
    return;
  }

  req.user = { id: 'api', role: 'service' };
  next();
}
