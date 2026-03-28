/**
 * Authentication Middleware
 * Verifies requests come from authorized sources
 */

import { Request, Response, NextFunction } from 'express';

const API_KEYS = process.env.API_KEYS?.split(',') || ['dev-key-123'];
const SHELL_ORIGINS = process.env.SHELL_ORIGINS?.split(',') || ['http://localhost:8888'];

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Allow GET requests without auth for manifest listing
  if (req.method === 'GET') {
    return next();
  }

  // Check Origin header for shell
  const origin = req.headers.origin;
  if (origin && SHELL_ORIGINS.includes(origin)) {
    return next();
  }

  // Check API key for programmatic access
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing API key'
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

  next();
}
