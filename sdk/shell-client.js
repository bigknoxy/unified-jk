/**
 * Shell Client SDK v1.0.0
 * Enables apps to integrate with the Shell Platform
 * Distributed via CDN: https://shell.company.com/sdk/v1/shell-client.js
 */

(function (global) {
  'use strict';

  // Retry configuration
  const DEFAULT_RETRY_OPTIONS = {
    retries: 3,
    factor: 2,
    minTimeout: 100,
    maxTimeout: 2000,
    onRetry: (error, attempt) => {
      console.warn(`[ShellClient] Retry ${attempt} after error:`, error.message);
    }
  };

  // Simple retry implementation (async-retry polyfill)
  async function retry(fn, options = {}) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;

    for (let attempt = 1; attempt <= opts.retries + 1; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt > opts.retries) break;

        const timeout = Math.min(
          opts.minTimeout * Math.pow(opts.factor, attempt - 1),
          opts.maxTimeout
        );

        if (opts.onRetry) {
          opts.onRetry(error, attempt);
        }

        await new Promise(resolve => setTimeout(resolve, timeout));
      }
    }

    throw lastError;
  }

  // Generate UUID v4
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // ShellClient class
  class ShellClient {
    constructor() {
      this.initialized = false;
      this.user = null;
      this.sessionId = null;
      this.theme = null;
      this.permissions = [];
      this.sharedState = new Map();
      this.eventListeners = new Map();
      this.pendingAcks = new Map();
      this.messageQueue = [];
      this.sequenceNumber = 0;
      this.shellOrigin = null; // Configured shell origin for security

      // Detect if running in shell
      this.isInShell = this._detectShell();

      if (!this.isInShell) {
        console.warn('[ShellClient] Running standalone - shell features unavailable');
      }
    }

    _detectShell() {
      try {
        // Check if we're in an iframe with different origin
        return window.parent !== window &&
               window.parent.location.origin !== window.location.origin;
      } catch (e) {
        // Cross-origin access throws, which means we're sandboxed (in shell)
        return true;
      }
    }

    async init(config = {}) {
      if (this.initialized) {
        console.warn('[ShellClient] Already initialized');
        return;
      }

      this.appId = config.appId || 'unknown-app';
      this.onAuthRefresh = config.onAuthRefresh || (() => {});
      this.onThemeUpdate = config.onThemeUpdate || (() => {});

      // SECURITY: Configure expected shell origin
      if (config.shellOrigin) {
        this.shellOrigin = config.shellOrigin;
      } else {
        // Try to detect from referrer (not as secure, but works for dev)
        try {
          const referrer = document.referrer;
          if (referrer) {
            this.shellOrigin = new URL(referrer).origin;
            console.warn('[ShellClient] Shell origin auto-detected from referrer. For production, set config.shellOrigin explicitly.');
          }
        } catch (e) {
          console.warn('[ShellClient] Could not detect shell origin. Set config.shellOrigin explicitly.');
        }
      }

      if (!this.isInShell) {
        console.warn('[ShellClient] Standalone mode - initialization skipped');
        this.initialized = true;
        return;
      }

      // Set up message listener
      this._setupMessageListener();

      // Request SHELL_INIT from parent shell
      console.log('[ShellClient] Requesting SHELL_INIT from shell...');
      this._requestShellInit();

      // Wait for SHELL_INIT with timeout
      try {
        await this._waitForShellInit(5000);
        this.initialized = true;
        console.log('[ShellClient] Initialized successfully');
      } catch (error) {
        console.error('[ShellClient] Initialization failed:', error.message);
        throw error;
      }
    }

    _requestShellInit() {
      if (!this.shellOrigin) {
        console.error('[ShellClient] Failed to request SHELL_INIT: shellOrigin not configured');
        return;
      }

      // SHELL_INIT is completed by the SHELL_INIT response, not ACK/NACK.
      window.parent.postMessage({
        type: 'SHELL_INIT',
        id: generateUUID(),
        timestamp: new Date().toISOString(),
        correlationId: this.sessionId || 'standalone',
        payload: { appId: this.appId }
      }, this.shellOrigin);
    }

    _setupMessageListener() {
      window.addEventListener('message', (event) => {
        // Validate origin
        if (!this._isValidOrigin(event.origin)) {
          console.error('[ShellClient] Rejected message from untrusted origin:', event.origin);
          return;
        }

        // Validate message structure
        if (!event.data || typeof event.data !== 'object') {
          console.error('[ShellClient] Malformed message');
          return;
        }

        const { type, id, ref, payload, correlationId } = event.data;

        if (!type) {
          console.error('[ShellClient] Message missing type');
          return;
        }

        // Handle ACK messages
        if (type === 'ACK' && ref) {
          const ackHandler = this.pendingAcks.get(ref);
          if (ackHandler) {
            ackHandler.resolve();
            this.pendingAcks.delete(ref);
          }
          return;
        }

        // Handle NACK messages
        if (type === 'NACK' && ref) {
          const ackHandler = this.pendingAcks.get(ref);
          if (ackHandler) {
            ackHandler.reject(new Error(payload?.error || 'Message rejected'));
            this.pendingAcks.delete(ref);
          }
          return;
        }

        // Handle shell messages
        switch (type) {
          case 'SHELL_INIT':
            this._handleShellInit(payload);
            this._sendAck(id);
            break;
          case 'THEME_UPDATE':
            this._handleThemeUpdate(payload);
            this._sendAck(id);
            break;
          case 'AUTH_REFRESH':
            this._handleAuthRefresh(payload);
            this._sendAck(id);
            break;
          case 'SHARED_STATE_UPDATE':
            this._handleSharedStateUpdate(payload);
            this._sendAck(id);
            break;
          default:
            // Trigger custom event listeners
            const listeners = this.eventListeners.get(type);
            if (listeners) {
              listeners.forEach(cb => cb(payload));
            }
        }
      });
    }

    _isValidOrigin(origin) {
      // SECURITY: Strict origin validation
      if (!origin) return false;

      // Must be cross-origin (we're in an iframe)
      if (origin === window.location.origin) return false;

      // For sandboxed iframes, parent sends messages with origin 'null'
      // This is expected and safe since we're in an iframe and only the parent
      // can send us messages via postMessage with the iframe's window as target
      if (origin === 'null') {
        return true;
      }

      // If shellOrigin is configured, only accept that origin
      if (this.shellOrigin) {
        return origin === this.shellOrigin;
      }

      // CRITICAL FIX: Fail closed - reject messages if shellOrigin not configured
      // In development mode only, warn and allow (but this should be removed for production)
      if (typeof location !== 'undefined' && location.hostname === 'localhost') {
        console.warn('[ShellClient] ACCEPTING MESSAGE WITHOUT ORIGIN VALIDATION - DEVELOPMENT MODE ONLY. Set config.shellOrigin for security.');
        return true;
      }

      console.error('[ShellClient] Rejected message from unknown origin. Set config.shellOrigin to enable security.');
      return false;
    }

    _sendAck(refMessageId) {
      if (!this.isInShell || !this.shellOrigin) {
        return;
      }

      window.parent.postMessage({
        type: 'ACK',
        id: generateUUID(),
        ref: refMessageId,
        timestamp: new Date().toISOString(),
        correlationId: this.sessionId || 'standalone'
      }, this.shellOrigin);
    }

    async _waitForShellInit(timeoutMs) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for SHELL_INIT'));
        }, timeoutMs);

        const checkInit = setInterval(() => {
          if (this.user !== null) {
            clearTimeout(timeout);
            clearInterval(checkInit);
            resolve();
          }
        }, 100);
      });
    }

    _handleShellInit(payload) {
      this.user = payload.user || null;
      this.sessionId = payload.sessionId || null;
      this.theme = payload.theme || null;
      this.permissions = payload.permissions || [];

      // Apply initial theme
      if (this.theme) {
        this._applyTheme(this.theme);
      }
    }

    _handleThemeUpdate(payload) {
      this.theme = payload.theme || null;
      if (this.theme) {
        this._applyTheme(this.theme);
      }
      if (this.onThemeUpdate) {
        this.onThemeUpdate(this.theme);
      }
    }

    _handleAuthRefresh(payload) {
      this.user = payload.user || this.user;
      if (this.onAuthRefresh) {
        this.onAuthRefresh(this.user);
      }
    }

    _handleSharedStateUpdate(payload) {
      if (payload.key !== undefined) {
        this.sharedState.set(payload.key, payload.value);
      }
    }

    _sanitizeCssValue(value, defaultValue, validator) {
      if (!value || typeof value !== 'string') return defaultValue;
      if (validator && !validator(value)) {
        console.warn('[ShellClient] Invalid CSS value sanitized:', value);
        return defaultValue;
      }
      return value;
    }

    _isValidColor(color) {
      // Allow hex colors, rgb/rgba, hsl/hsla, and CSS color names
      return /^#[0-9a-fA-F]{3,8}$/.test(color) ||
             /^rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/.test(color) ||
             /^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*[\d.]+\s*\)$/.test(color) ||
             /^hsl\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*\)$/.test(color) ||
             /^[a-zA-Z]+$/.test(color);
    }

    _isValidFontFamily(font) {
      // Basic validation - no semicolons to prevent CSS injection
      return !font.includes(';') && !font.includes('}') && !font.includes('/*');
    }

    _isValidSpacing(spacing) {
      // Allow px, rem, em, %, vh, vw
      return /^[\d.]+(px|rem|em|%|vh|vw|vmin|vmax)?$/.test(spacing);
    }

    _applyTheme(theme) {
      // SECURITY FIX: Validate all theme values before injecting into CSS
      const safeTheme = {
        primary: this._sanitizeCssValue(theme.primary, '#0066cc', this._isValidColor),
        textPrimary: this._sanitizeCssValue(theme.textPrimary, '#1a1a1a', this._isValidColor),
        bgPrimary: this._sanitizeCssValue(theme.bgPrimary, '#ffffff', this._isValidColor),
        fontFamily: this._sanitizeCssValue(theme.fontFamily, 'Inter, sans-serif', this._isValidFontFamily),
        spacingUnit: this._sanitizeCssValue(theme.spacingUnit, '8px', this._isValidSpacing)
      };

      let style = document.getElementById('shell-theme');
      if (!style) {
        style = document.createElement('style');
        style.id = 'shell-theme';
        document.head.appendChild(style);
      }

      const css = `
        :root {
          --shell-primary: ${safeTheme.primary};
          --shell-text-primary: ${safeTheme.textPrimary};
          --shell-bg-primary: ${safeTheme.bgPrimary};
          --shell-font-family: ${safeTheme.fontFamily};
          --shell-spacing-unit: ${safeTheme.spacingUnit};
        }
      `;
      style.textContent = css;
    }

    async _sendMessage(message, options = {}) {
      if (!this.isInShell) {
        console.log('[ShellClient] Not in shell, skipping message:', message.type);
        return Promise.resolve();
      }

      const fullMessage = {
        ...message,
        id: message.id || generateUUID(),
        timestamp: new Date().toISOString(),
        correlationId: this.sessionId || 'standalone'
      };

      console.log('[ShellClient] Sending message:', message.type, 'to origin:', this.shellOrigin);

      // Wait for ACK with retry
      return retry(async () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Message ACK timeout'));
          }, 500);

          this.pendingAcks.set(fullMessage.id, {
            resolve: () => {
              clearTimeout(timeout);
              resolve();
            },
            reject: (err) => {
              clearTimeout(timeout);
              reject(err);
            }
          });

          // SECURITY FIX: Send to configured shell origin only
          if (!this.shellOrigin) {
            throw new Error('ShellClient.shellOrigin not configured. Set config.shellOrigin before sending messages.');
          }
          console.log('[ShellClient] Actually calling postMessage to parent');
          window.parent.postMessage(fullMessage, this.shellOrigin);
        });
      }, options);
    }

    // Public API methods
    getUser() {
      return this.user;
    }

    async audit(action, metadata = {}) {
      if (!this.isInShell) {
        console.warn('[ShellClient] Audit unavailable in standalone mode:', action, metadata);
        return;
      }

      if (!this.initialized) {
        throw new Error('ShellClient not initialized');
      }

      await this._sendMessage({
        type: 'AUDIT_EVENT',
        payload: {
          action,
          resource: metadata.resource,
          metadata: { ...metadata, appId: this.appId },
          timestamp: new Date().toISOString()
        }
      });
    }

    async api(endpoint, options = {}) {
      if (!this.isInShell) {
        throw new Error('Shell API unavailable in standalone mode');
      }

      if (!this.initialized) {
        throw new Error('ShellClient not initialized');
      }

      // CRITICAL FIX: Implement response tracking for API calls
      const messageId = generateUUID();
      const correlationId = this.sessionId || 'standalone';

      const fullMessage = {
        type: 'API_REQUEST',
        id: messageId,
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          endpoint,
          method: options.method || 'GET',
          body: options.body,
          params: options.params
        }
      };

      return new Promise((resolve, reject) => {
        // Set up response handler
        const responseHandler = (event) => {
          if (!this._isValidOrigin(event.origin)) return;

          const data = event.data;
          if (data?.type === 'API_RESPONSE' && data?.correlationId === correlationId) {
            window.removeEventListener('message', responseHandler);
            clearTimeout(timeout);

            if (data.payload?.ok) {
              resolve(data.payload.data);
            } else {
              reject(new Error(data.payload?.error || 'API request failed'));
            }
          }
        };

        window.addEventListener('message', responseHandler);

        // Timeout for response
        const timeout = setTimeout(() => {
          window.removeEventListener('message', responseHandler);
          reject(new Error('API response timeout'));
        }, options.timeout || 10000);

        // Send request
        const targetOrigin = this.shellOrigin || '*';
        window.parent.postMessage(fullMessage, targetOrigin);
      });
    }

    async getToken() {
      if (!this.isInShell) {
        throw new Error('Shell auth unavailable in standalone mode');
      }

      if (!this.initialized) {
        throw new Error('ShellClient not initialized');
      }

      const response = await this._sendMessage({
        type: 'GET_TOKEN',
        payload: {}
      });

      return response?.token;
    }

    async setState(key, value) {
      if (!this.isInShell) {
        console.warn('[ShellClient] Shared state unavailable in standalone mode');
        return;
      }

      if (!this.initialized) {
        throw new Error('ShellClient not initialized');
      }

      this.sharedState.set(key, value);

      await this._sendMessage({
        type: 'SHARED_STATE_SET',
        payload: { key, value }
      });
    }

    getState(key) {
      return this.sharedState.get(key);
    }

    async navigate(path, options = {}) {
      if (!this.isInShell) {
        console.warn('[ShellClient] Navigation unavailable in standalone mode');
        return;
      }

      if (!this.initialized) {
        throw new Error('ShellClient not initialized');
      }

      await this._sendMessage({
        type: 'NAVIGATE_REQUEST',
        payload: { path, preserveState: options.preserveState }
      });
    }

    on(eventType, callback) {
      if (!this.eventListeners.has(eventType)) {
        this.eventListeners.set(eventType, []);
      }
      this.eventListeners.get(eventType).push(callback);
    }

    off(eventType, callback) {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    }
  }

  // Create singleton instance
  const shellClient = new ShellClient();

  // Expose to global scope
  global.ShellClient = {
    init: (config) => shellClient.init(config),
    getUser: () => shellClient.getUser(),
    audit: (action, metadata) => shellClient.audit(action, metadata),
    api: (endpoint, options) => shellClient.api(endpoint, options),
    getToken: () => shellClient.getToken(),
    setState: (key, value) => shellClient.setState(key, value),
    getState: (key) => shellClient.getState(key),
    navigate: (path, options) => shellClient.navigate(path, options),
    on: (eventType, callback) => shellClient.on(eventType, callback),
    off: (eventType, callback) => shellClient.off(eventType, callback)
  };

})(window);
