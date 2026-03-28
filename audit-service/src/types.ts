/**
 * Audit Event Types
 */

export interface AuditEvent {
  id: string;
  action: string;
  resource?: string;
  appId: string;
  userId: string;
  sessionId: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface AuditBatchRequest {
  events: AuditEvent[];
}

export interface AuditResponse {
  success: boolean;
  received: number;
  persisted: number;
  errors?: string[];
}
