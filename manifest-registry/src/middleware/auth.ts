/**
 * Authentication Middleware
 * Verifies requests come from authorized sources
 */

import { Request, Response, NextFunction } from 'express';

const API_KEYS = process.env.API_KEYS?.split(',') || ['dev-key-123'];

function getPermissions(req: Request): string[] {
  return req.headers['x-user-permissions']
    ?.toString()
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean) || [];
}

function hasAdminWrite(req: Request): boolean {
  const permissions = getPermissions(req);
  return permissions.includes('admin:write');
}

function hasAdminRead(req: Request): boolean {
  const permissions = getPermissions(req);
  return permissions.includes('admin:read') || permissions.includes('admin:write');
}

function hasValidApiKey(req: Request): boolean {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  return !!apiKey && API_KEYS.includes(apiKey as string);
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Allow GET requests without auth for manifest listing
  if (req.method === 'GET') {
    if (req.query.includeDisabled === 'true') {
      if (!hasValidApiKey(req)) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid API key'
        });
        return;
      }

      if (!hasAdminRead(req)) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'admin:read permission required to include disabled apps'
        });
        return;
      }
    }

    return next();
  }

  if (!hasValidApiKey(req)) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or invalid API key'
    });
    return;
  }

  if (!hasAdminWrite(req)) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'admin:write permission required'
    });
    return;
  }

  next();
}
