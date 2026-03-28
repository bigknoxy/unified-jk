/**
 * Shell Container Component
 * Main orchestrator that manages layout, iframes, and lifecycle
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AppManifest, User, Theme, NavItem, ShellConfig } from '../types';
import { initializeAuth } from '../services/auth';
import { initializeAudit } from '../services/audit';
import { MessageHandlerService } from '../services/message-handler';
import { IframeManager } from '../services/iframe-manager';
import './shell-header';
import './shell-navigation';

@customElement('shell-container')
export class ShellContainer extends LitElement {
  @property({ type: String }) title = 'App Shell';
  @property({ type: String }) logo?: string;
  @property({ type: Array }) apps: AppManifest[] = [];
  @property({ type: Object }) config!: ShellConfig;

  @state() private user: User | null = null;
  @state() private activeAppId = '';
  @state() private navCollapsed = false;
  @state() private isLoading = true;
  @state() private error: string | null = null;

  private authService?: ReturnType<typeof initializeAuth>;
  private auditService?: ReturnType<typeof initializeAudit>;
  private messageHandler?: MessageHandlerService;
  private iframeManager?: IframeManager;
  private sharedState = new Map<string, unknown>();

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      font-family: var(--shell-font-family, Inter, sans-serif);
    }

    .shell {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .iframe-container {
      flex: 1;
      position: relative;
      overflow: hidden;
      background: var(--shell-bg-secondary, #f8fafc);
    }

    .iframe-container :global(iframe) {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: none;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--shell-text-secondary, #6b7280);
      text-align: center;
      padding: 48px;
    }

    .empty-state-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .empty-state h2 {
      margin: 0 0 8px;
      font-size: 20px;
      color: var(--shell-text-primary, #1a1a1a);
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--shell-text-secondary, #6b7280);
    }

    .error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 48px;
      text-align: center;
    }

    .error h2 {
      color: var(--shell-error, #dc2626);
      margin: 0 0 16px;
    }

    .error button {
      margin-top: 16px;
      padding: 8px 16px;
      background: var(--shell-primary, #0066cc);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.initializeServices();
  }

  firstUpdated(): void {
    // Initialize iframe manager after first render when DOM is ready
    this.initializeIframeManager();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
  }

  private async initializeServices(): Promise<void> {
    try {
      // Initialize auth
      this.authService = initializeAuth({
        provider: this.config.authProvider,
        refreshBuffer: 60
      });

      // Try to restore session
      this.user = await this.authService.initialize();

      // Initialize audit service
      this.auditService = initializeAudit({
        endpoint: this.config.auditEndpoint,
        batchSize: 10,
        flushInterval: 5000,
        maxRetries: 3,
        retryDelay: 1000
      });

      // Log session start
      this.auditService.log('SHELL_SESSION_START', {
        userId: this.user?.id || 'anonymous'
      });

      // Set up theme CSS variables
      this.applyTheme(this.config.theme);

      // Initialize message handler (doesn't depend on DOM)
      this.messageHandler = new MessageHandlerService({
        theme: this.config.theme,
        sessionId: this.auditService.getCorrelationId(),
        onNavigate: (path, preserveState) => {
          this.handleNavigation(path, preserveState);
        },
        onSharedStateUpdate: (key, value) => {
          this.sharedState.set(key, value);
        }
      });

      this.isLoading = false;
    } catch (err) {
      console.error('[Shell] Initialization failed:', err);
      this.error = 'Failed to initialize shell. Please refresh and try again.';
      this.isLoading = false;
    }
  }

  private initializeIframeManager(): void {
    if (!this.auditService) return;

    const iframeContainer = this.shadowRoot?.querySelector('.iframe-container');
    if (iframeContainer) {
      this.iframeManager = new IframeManager({
        maxIframes: this.config.maxIframes,
        container: iframeContainer as HTMLElement,
        onAppActivate: (appId) => {
          this.auditService?.log('APP_ACTIVATED', { appId });
        },
        onAppDeactivate: (appId) => {
          this.auditService?.log('APP_DEACTIVATED', { appId });
        }
      });
    }
  }

  private cleanup(): void {
    this.messageHandler?.destroy();
    this.iframeManager?.destroy();
    this.auditService?.destroy();
  }

  private applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.style.setProperty('--shell-primary', theme.primary);
    root.style.setProperty('--shell-text-primary', theme.textPrimary);
    root.style.setProperty('--shell-bg-primary', theme.bgPrimary);
    root.style.setProperty('--shell-font-family', theme.fontFamily);
    root.style.setProperty('--shell-spacing-unit', theme.spacingUnit);

    // Extended properties
    if (theme.secondary) {
      root.style.setProperty('--shell-secondary', theme.secondary);
    }
    if (theme.success) {
      root.style.setProperty('--shell-success', theme.success);
    }
    if (theme.warning) {
      root.style.setProperty('--shell-warning', theme.warning);
    }
    if (theme.error) {
      root.style.setProperty('--shell-error', theme.error);
    }
    if (theme.borderRadius) {
      root.style.setProperty('--shell-border-radius', theme.borderRadius);
    }
  }

  private handleLogin(): void {
    this.authService?.login();
  }

  private handleLogout(): void {
    this.auditService?.log('SHELL_LOGOUT', {
      userId: this.user?.id || 'anonymous'
    });
    this.authService?.logout();
  }

  private async handleNavigation(
    event: CustomEvent<{ item: NavItem }> | string,
    preserveState?: boolean
  ): Promise<void> {
    let appId: string;

    if (typeof event === 'string') {
      // Direct navigation from postMessage
      const manifest = this.apps.find((a) =>
        new URL(a.url, window.location.origin).pathname === event
      );
      appId = manifest?.id || '';
    } else {
      // Navigation from UI
      appId = event.detail.item.appId;
    }

    if (!appId) return;

    const manifest = this.apps.find((a) => a.id === appId);
    if (!manifest) return;

    // Check permissions
    if (!this.authService?.hasAnyPermission(manifest.permissions)) {
      console.warn(`[Shell] User lacks permissions for app: ${appId}`);
      return;
    }

    this.activeAppId = appId;

    // Mount the app
    await this.iframeManager?.mountApp(manifest);

    // Register origin for message handling
    try {
      const url = new URL(manifest.url);
      this.messageHandler?.registerOrigin(url.origin);
    } catch {
      console.warn('[Shell] Invalid app URL:', manifest.url);
    }
  }

  private handleNavCollapse(event: CustomEvent<{ collapsed: boolean }>): void {
    this.navCollapsed = event.detail.collapsed;
  }

  get navigationItems(): NavItem[] {
    return this.apps
      .filter((app) => {
        // Only show apps user has permission for
        return this.authService?.hasAnyPermission(app.permissions);
      })
      .map((app) => ({
        id: app.id,
        label: app.name,
        icon: app.icon || 'grid',
        appId: app.id
      }));
  }

  render() {
    if (this.isLoading) {
      return html`
        <div class="loading">
          <svg width="32" height="32" viewBox="0 0 24 24" class="spinner">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="31.42"
              stroke-dashoffset="10"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="31.42"
                to="0"
                dur="1s"
                repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div class="error">
          <h2>${this.error}</h2>
          <button @click="${() => window.location.reload()}">Retry</button>
        </div>
      `;
    }

    return html`
      <div class="shell">
        <shell-header
          .title="${this.title}"
          .logo="${this.logo}"
          .user="${this.user}"
          @login="${this.handleLogin}"
          @logout="${this.handleLogout}"
        ></shell-header>

        <div class="main">
          ${this.user
            ? html`
                <shell-navigation
                  .items="${this.navigationItems}"
                  .activeAppId="${this.activeAppId}"
                  ?collapsed="${this.navCollapsed}"
                  @navigate="${this.handleNavigation}"
                  @collapse="${this.handleNavCollapse}"
                ></shell-navigation>
              `
            : null}

          <div class="content">
            <div class="iframe-container">
              ${this.activeAppId
                ? null
                : html`
                    <div class="empty-state">
                      <svg
                        class="empty-state-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1"
                      >
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                      </svg>
                      <h2>Select an app to get started</h2>
                      <p>Choose an application from the sidebar to begin working.</p>
                    </div>
                  `}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-container': ShellContainer;
  }
}
