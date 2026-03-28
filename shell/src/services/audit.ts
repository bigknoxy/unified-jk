/**
 * Audit Service - Async with in-memory queue and retry
 * Buffers events and sends to audit endpoint
 */

import type { AuditEvent } from '../types';

interface AuditConfig {
  endpoint: string;
  batchSize: number;
  flushInterval: number; // ms
  maxRetries: number;
  retryDelay: number; // ms
}

interface QueuedEvent {
  event: AuditEvent;
  retries: number;
}

export class AuditService {
  private config: AuditConfig;
  private queue: QueuedEvent[] = [];
  private flushTimer: number | null = null;
  private correlationId: string;

  constructor(config: AuditConfig) {
    this.config = {
      batchSize: 10,
      flushInterval: 5000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
    this.correlationId = this.generateCorrelationId();

    // Start flush interval
    this.startFlushTimer();

    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flush());
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      if (this.queue.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  log(action: string, metadata?: Record<string, unknown>): void {
    const event: AuditEvent = {
      id: this.generateEventId(),
      action,
      appId: metadata?.appId as string || 'shell',
      userId: metadata?.userId as string || 'anonymous',
      sessionId: metadata?.sessionId as string || this.correlationId,
      correlationId: this.correlationId,
      resource: metadata?.resource as string,
      metadata,
      timestamp: new Date().toISOString()
    };

    this.queue.push({ event, retries: 0 });

    // Flush immediately if batch size reached
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.config.batchSize);
    const events = batch.map(q => q.event);

    try {
      await this.sendWithRetry(events);
    } catch (error) {
      // Re-queue failed events if they haven't exceeded retry limit
      for (const item of batch) {
        if (item.retries < this.config.maxRetries) {
          item.retries++;
          this.queue.push(item);
        }
        // Events exceeding max retries are dropped (logged to console)
        else {
          console.error('[Audit] Event dropped after max retries:', item.event);
        }
      }
    }
  }

  private async sendWithRetry(events: AuditEvent[]): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.maxRetries) {
          await this.delay(this.config.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateEventId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getCorrelationId(): string {
    return this.correlationId;
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }
}

// Singleton instance
let auditService: AuditService | null = null;

export function initializeAudit(config: AuditConfig): AuditService {
  auditService = new AuditService(config);
  return auditService;
}

export function getAuditService(): AuditService {
  if (!auditService) {
    throw new Error('Audit service not initialized');
  }
  return auditService;
}
