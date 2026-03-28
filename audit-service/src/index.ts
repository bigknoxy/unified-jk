/**
 * Audit Service - Main Entry Point
 * Receives batched audit events from the Shell Platform
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { auditRouter } from './routes/audit.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"]
    }
  }
}));

// CORS - restrict to shell origins in production
const corsOrigins = process.env.SHELL_ORIGINS?.split(',') || ['http://localhost:8888'];
app.use(cors({
  origin: NODE_ENV === 'production' ? corsOrigins : true,
  credentials: true
}));

// Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure logs directory exists
import { mkdirSync } from 'fs';
const logsDir = join(__dirname, '../logs');
try {
  mkdirSync(logsDir, { recursive: true });
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Routes
app.use('/health', healthRouter);
app.use('/api/audit', authMiddleware, auditRouter);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[AuditService] Server running on port ${PORT}`);
  console.log(`[AuditService] Environment: ${NODE_ENV}`);
  console.log(`[AuditService] CORS origins:`, corsOrigins);
  console.log(`[AuditService] Logs directory:`, logsDir);
});

export default app;
