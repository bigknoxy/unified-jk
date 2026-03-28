/**
 * Audit Routes
 * POST /api/audit - Receive batched audit events
 * GET /api/audit - Query audit events (admin only)
 */

import { Router, Request, Response } from 'express';
import { appendFileSync, existsSync, createReadStream } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { AuditEvent, AuditBatchRequest, AuditResponse } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();
const LOGS_DIR = join(__dirname, '../../logs');
const AUDIT_LOG_FILE = join(LOGS_DIR, 'audit.jsonl');

// Simple in-memory stats (reset on restart)
const stats = {
  totalEvents: 0,
  eventsToday: 0,
  lastReset: new Date().toISOString().split('T')[0]
};

/**
 * Validate an audit event has required fields
 */
function validateEvent(event: unknown): event is AuditEvent {
  if (typeof event !== 'object' || event === null) return false;
  const e = event as Partial<AuditEvent>;
  return (
    typeof e.id === 'string' &&
    typeof e.action === 'string' &&
    typeof e.appId === 'string' &&
    typeof e.userId === 'string' &&
    typeof e.sessionId === 'string' &&
    typeof e.correlationId === 'string' &&
    typeof e.timestamp === 'string'
  );
}

/**
 * Store events to JSONL file
 */
function persistEvents(events: AuditEvent[]): { persisted: number; errors: string[] } {
  const errors: string[] = [];
  let persisted = 0;

  for (const event of events) {
    try {
      const line = JSON.stringify(event) + '\n';
      appendFileSync(AUDIT_LOG_FILE, line, 'utf-8');
      persisted++;
      stats.totalEvents++;
      stats.eventsToday++;
    } catch (error) {
      errors.push(`Failed to persist event ${event.id}: ${(error as Error).message}`);
    }
  }

  return { persisted, errors };
}

// POST /api/audit - Receive batched events
router.post('/', (req: Request, res: Response) => {
  const { events } = req.body as AuditBatchRequest;

  if (!Array.isArray(events)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: events must be an array'
    });
  }

  if (events.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request: events array is empty'
    });
  }

  if (events.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Batch size too large: maximum 100 events per batch'
    });
  }

  // Validate all events
  const validEvents: AuditEvent[] = [];
  const validationErrors: string[] = [];

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (validateEvent(event)) {
      validEvents.push(event);
    } else {
      validationErrors.push(`Event at index ${i} is missing required fields`);
    }
  }

  // Persist valid events
  const { persisted, errors: persistErrors } = persistEvents(validEvents);

  // Log summary
  console.log(`[AuditService] Received ${events.length} events, persisted ${persisted}`);

  const response: AuditResponse = {
    success: persisted === events.length,
    received: events.length,
    persisted,
    errors: [...validationErrors, ...persistErrors]
  };

  // Return 202 Accepted even if some events failed (client can retry)
  res.status(persisted === events.length ? 201 : 202).json(response);
});

// GET /api/audit - Query events (basic implementation)
router.get('/', (req: Request, res: Response) => {
  const { limit = '100', action, userId, appId, correlationId } = req.query;
  const maxResults = Math.min(parseInt(limit as string, 10) || 100, 1000);

  if (!existsSync(AUDIT_LOG_FILE)) {
    return res.json({
      events: [],
      total: 0,
      stats
    });
  }

  const events: AuditEvent[] = [];
  const readStream = createReadStream(AUDIT_LOG_FILE, { encoding: 'utf-8' });
  let buffer = '';

  readStream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line) as AuditEvent;

        // Apply filters
        if (action && event.action !== action) continue;
        if (userId && event.userId !== userId) continue;
        if (appId && event.appId !== appId) continue;
        if (correlationId && event.correlationId !== correlationId) continue;

        events.push(event);
      } catch (error) {
        console.error('[AuditService] Failed to parse event:', line);
      }
    }
  });

  readStream.on('end', () => {
    // Sort by timestamp descending and limit
    const sorted = events
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxResults);

    res.json({
      events: sorted,
      total: events.length,
      stats: {
        ...stats,
        eventsInFile: events.length
      }
    });
  });

  readStream.on('error', (error) => {
    console.error('[AuditService] Error reading audit log:', error);
    res.status(500).json({
      error: 'Failed to read audit log',
      message: (error as Error).message
    });
  });
});

export { router as auditRouter };
