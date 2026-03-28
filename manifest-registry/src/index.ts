/**
 * Manifest Registry - Main Entry Point
 * Manages app manifests for the Shell Platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { manifestsRouter } from './routes/manifests.js';
import { healthRouter } from './routes/health.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 8081;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet());

// CORS
const corsOrigins = process.env.SHELL_ORIGINS?.split(',') || ['http://localhost:8888'];
app.use(cors({
  origin: NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true
}));

// Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/api/manifests', authMiddleware, manifestsRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ManifestRegistry] Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[ManifestRegistry] Server running on port ${PORT}`);
  console.log(`[ManifestRegistry] Environment: ${NODE_ENV}`);
  console.log(`[ManifestRegistry] CORS origins:`, corsOrigins);
});

export default app;
