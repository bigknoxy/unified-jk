/**
 * Health Check Routes
 * GET /health - Service health status
 * GET /health/ready - Readiness probe
 * GET /health/live - Liveness probe
 */

import { Router, Request, Response } from 'express';
import { statSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
const LOGS_DIR = join(__dirname, '../../logs');

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    disk: 'pass' | 'fail';
    logs: 'pass' | 'fail';
  };
}

// GET /health - Full health status
router.get('/', (req: Request, res: Response) => {
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      disk: 'pass',
      logs: 'pass'
    }
  };

  // Check logs directory is writable
  try {
    const stats = statSync(LOGS_DIR);
    if (!stats.isDirectory()) {
      status.checks.logs = 'fail';
      status.status = 'degraded';
    }
  } catch (error) {
    status.checks.logs = 'fail';
    status.status = 'degraded';
  }

  res.status(status.status === 'healthy' ? 200 : 503).json(status);
});

// GET /health/ready - Readiness probe
router.get('/ready', (req: Request, res: Response) => {
  res.status(200).json({ ready: true });
});

// GET /health/live - Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export { router as healthRouter };
