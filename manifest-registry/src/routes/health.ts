/**
 * Health Check Routes
 */

import { Router, Request, Response } from 'express';
import { ManifestStore } from '../store.js';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  manifests: number;
}

router.get('/', (req: Request, res: Response) => {
  const status: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    manifests: ManifestStore.count
  };

  res.json(status);
});

export { router as healthRouter };
