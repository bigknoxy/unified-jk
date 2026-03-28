/**
 * postMessage Handler Service
 * Handles messages from child iframes via the SDK
 */

import type {
  ShellMessage,
  ShellInitPayload,
  APIRequestPayload,
  NavigationPayload,
  User,
  Theme
} from '../types';
import { getAuthService } from './auth';
import { getAuditService } from './audit';

interface MessageHandlerConfig {
  theme: Theme;
  sessionId: string;
  onNavigate: (path: string, preserveState?: boolean) => void;
  onSharedStateUpdate: (key: string, value: unknown) => void;
}

interface PendingAck {
  resolve: () => void;
  reject: (error: Error) => void;
  timeout: number;
}

export class MessageHandlerService {
  private config: MessageHandlerConfig;
  private pendingAcks = new Map<string, PendingAck>();
  private sharedState = new Map<string, unknown>();
  private allowedOrigins: Set<string> = new Set();
  private boundHandleMessage: (event: MessageEvent<unknown>) => void;

  constructor(config: MessageHandlerConfig) {
    this.config = config;
    this.boundHandleMessage = this.handleMessage.bind(this);
    this.setupListener();
  }

  registerOrigin(origin: string): void {
    this.allowedOrigins.add(origin);
  }

  unregisterOrigin(origin: string): void {
    this.allowedOrigins.delete(origin);
  }

  private setupListener(): void {
    window.addEventListener('message', this.boundHandleMessage);
  }

  private handleMessage(event: MessageEvent<unknown>): void {
    // Validate origin - strict CORS enforcement
    if (!this.isValidOrigin(event.origin)) {
      console.error('[Shell] Rejected message from untrusted origin:', event.origin);
      return;
    }

    // Validate message structure
    if (!this.isValidMessage(event.data)) {
      console.error('[Shell] Malformed message from', event.origin);
      return;
    }

    const message = event.data as ShellMessage;
    const source = event.source as Window;

    // Handle ACK/NACK
    if (message.type === 'ACK') {
      this.handleAck(message);
      return;
    }
    if (message.type === 'NACK') {
      this.handleNack(message);
      return;
    }

    // Process message and send ACK
    this.processMessage(message, source, event.origin)
      .then(() => this.sendAck(source, message.id, event.origin))
      .catch(error => {
        console.error('[Shell] Message processing error:', error);
        this.sendNack(source, message.id, error.message, event.origin);
      });
  }

  private isValidOrigin(origin: string): boolean {
    // Always validate against registered origins
    // Additional check: must be cross-origin
    return this.allowedOrigins.has(origin) && origin !== window.location.origin;
  }

  private isValidMessage(data: unknown): data is ShellMessage {
    if (typeof data !== 'object' || data === null) return false;
    const msg = data as Partial<ShellMessage>;
    return (
      typeof msg.type === 'string' &&
      typeof msg.id === 'string' &&
      typeof msg.timestamp === 'string' &&
      typeof msg.correlationId === 'string'
    );
  }

  private async processMessage(
    message: ShellMessage,
    source: Window,
    origin: string
  ): Promise<void> {
    // Safely get services with null checks
    let authService: ReturnType<typeof getAuthService> | null = null;
    let auditService: ReturnType<typeof getAuditService> | null = null;

    try {
      authService = getAuthService();
      auditService = getAuditService();
    } catch {
      // Services not initialized yet, reject message
      throw new Error('Services not initialized');
    }

    const user = authService.getUser();

    // Log audit event for security-sensitive operations
    const shouldAudit = ['API_REQUEST', 'GET_TOKEN', 'NAVIGATE_REQUEST', 'SHARED_STATE_SET'].includes(message.type);
    if (shouldAudit && auditService) {
      auditService.log('APP_MESSAGE_RECEIVED', {
        appId: message.correlationId,
        action: message.type,
        resource: (message.payload as { endpoint?: string })?.endpoint
      });
    }

    switch (message.type) {
      case 'SHELL_INIT':
        // Already initialized, send current state
        this.sendShellInit(source, origin, authService);
        break;

      case 'AUDIT_EVENT':
        await this.handleAuditEvent(message.payload, authService, auditService);
        break;

      case 'API_REQUEST':
        await this.handleApiRequest(message.payload as APIRequestPayload, source, origin, authService);
        break;

      case 'GET_TOKEN':
        await this.handleGetToken(source, origin, authService);
        break;

      case 'SHARED_STATE_SET':
        this.handleSharedStateSet(message.payload as { key: string; value: unknown });
        break;

      case 'NAVIGATE_REQUEST':
        this.handleNavigate(message.payload as NavigationPayload);
        break;

      default:
        console.warn('[Shell] Unknown message type:', message.type);
    }
  }

  private sendShellInit(target: Window, origin: string, authService: ReturnType<typeof getAuthService>): void {
    const user = authService.getUser();

    if (!user) return;

    const payload: ShellInitPayload = {
      user,
      sessionId: this.config.sessionId,
      theme: this.config.theme,
      permissions: user.permissions
    };

    this.sendMessage(target, {
      type: 'SHELL_INIT',
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      correlationId: this.config.sessionId,
      payload
    }, origin);
  }

  private async handleAuditEvent(
    payload: unknown,
    authService: ReturnType<typeof getAuthService>,
    auditService: ReturnType<typeof getAuditService> | null
  ): Promise<void> {
    const { action, resource, metadata, appId } = payload as {
      action: string;
      resource?: string;
      metadata?: Record<string, unknown>;
      appId?: string;
    };

    const user = authService.getUser();

    if (auditService) {
      auditService.log(action, {
        ...metadata,
        appId: appId || 'unknown',
        userId: user?.id || 'anonymous',
        resource
      });
    }
  }

  private async handleApiRequest(
    payload: APIRequestPayload,
    source: Window,
    origin: string,
    authService: ReturnType<typeof getAuthService>
  ): Promise<void> {
    try {
      // Proxy request through auth service (adds auth headers)
      const response = await authService.proxyRequest(payload.endpoint, {
        method: payload.method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: payload.body ? JSON.stringify(payload.body) : undefined
      });

      const data = await response.json().catch(() => null);

      this.sendMessage(source, {
        type: 'API_RESPONSE',
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        correlationId: this.config.sessionId,
        payload: {
          status: response.status,
          ok: response.ok,
          data
        }
      }, origin);
    } catch (error) {
      this.sendMessage(source, {
        type: 'API_RESPONSE',
        id: this.generateId(),
        timestamp: new Date().toISOString(),
        correlationId: this.config.sessionId,
        payload: {
          status: 500,
          ok: false,
          error: (error as Error).message
        }
      }, origin);
    }
  }

  private async handleGetToken(
    target: Window,
    origin: string,
    authService: ReturnType<typeof getAuthService>
  ): Promise<void> {
    const token = await authService.getToken();

    this.sendMessage(target, {
      type: 'TOKEN_RESPONSE',
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      correlationId: this.config.sessionId,
      payload: { token }
    }, origin);
  }

  private handleSharedStateSet(payload: { key: string; value: unknown }): void {
    this.sharedState.set(payload.key, payload.value);
    this.config.onSharedStateUpdate(payload.key, payload.value);
  }

  private handleNavigate(payload: NavigationPayload): void {
    this.config.onNavigate(payload.path, payload.preserveState);
  }

  private sendMessage(target: Window, message: Omit<ShellMessage, 'correlationId'> & Partial<Pick<ShellMessage, 'correlationId'>>, targetOrigin: string): void {
    const fullMessage: ShellMessage = {
      ...message,
      correlationId: this.config.sessionId
    };
    target.postMessage(fullMessage, targetOrigin);
  }

  private sendAck(target: Window, refMessageId: string, origin: string): void {
    target.postMessage({
      type: 'ACK',
      id: this.generateId(),
      ref: refMessageId,
      timestamp: new Date().toISOString(),
      correlationId: this.config.sessionId
    }, origin);
  }

  private sendNack(target: Window, refMessageId: string, error: string, origin: string): void {
    target.postMessage({
      type: 'NACK',
      id: this.generateId(),
      ref: refMessageId,
      payload: { error },
      timestamp: new Date().toISOString(),
      correlationId: this.config.sessionId
    }, origin);
  }

  private handleAck(message: ShellMessage): void {
    const ref = (message as unknown as { ref?: string }).ref;
    if (ref) {
      const ack = this.pendingAcks.get(ref);
      if (ack) {
        clearTimeout(ack.timeout);
        ack.resolve();
        this.pendingAcks.delete(ref);
      }
    }
  }

  private handleNack(message: ShellMessage): void {
    const ref = (message as unknown as { ref?: string }).ref;
    const error = (message.payload as { error?: string })?.error || 'Unknown error';
    if (ref) {
      const ack = this.pendingAcks.get(ref);
      if (ack) {
        clearTimeout(ack.timeout);
        ack.reject(new Error(error));
        this.pendingAcks.delete(ref);
      }
    }
  }

  broadcastTheme(theme: Theme): void {
    this.allowedOrigins.forEach(origin => {
      // Find iframe with this origin
      const iframe = document.querySelector(`iframe[src^="${origin}"]`) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        this.sendMessage(iframe.contentWindow, {
          type: 'THEME_UPDATE',
          id: this.generateId(),
          timestamp: new Date().toISOString(),
          correlationId: this.config.sessionId,
          payload: { theme }
        }, origin);
      }
    });
  }

  broadcastAuthRefresh(user: User): void {
    this.allowedOrigins.forEach(origin => {
      const iframe = document.querySelector(`iframe[src^="${origin}"]`) as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        this.sendMessage(iframe.contentWindow, {
          type: 'AUTH_REFRESH',
          id: this.generateId(),
          timestamp: new Date().toISOString(),
          correlationId: this.config.sessionId,
          payload: { user }
        }, origin);
      }
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  destroy(): void {
    window.removeEventListener('message', this.boundHandleMessage);
    this.pendingAcks.clear();
  }
}
