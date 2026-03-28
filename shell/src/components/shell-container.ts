/**
 * Shell Container Component
 * Main orchestrator that manages layout, iframes, and lifecycle
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AppManifest, User, Theme, NavItem, ShellConfig } from '../types';
import { DEMO_USERS } from '../types';
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
  @state() private showDemoLogin = false;

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

    .demo-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .demo-modal {
      background: var(--shell-bg-primary, #ffffff);
      border-radius: 12px;
      padding: 32px;
      max-width: 480px;
      width: 90%;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    }

    .demo-modal h2 {
      margin: 0 0 8px;
      font-size: 20px;
      color: var(--shell-text-primary, #1a1a1a);
    }

    .demo-modal p {
      margin: 0 0 24px;
      color: var(--shell-text-secondary, #6b7280);
      font-size: 14px;
    }

    .demo-users {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .demo-user-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 2px solid var(--shell-border-color, #e5e7eb);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s;
      background: var(--shell-bg-primary, #ffffff);
    }

    .demo-user-card:hover {
      border-color: var(--shell-primary, #0066cc);
      background: var(--shell-bg-secondary, #f8fafc);
    }

    .demo-user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--shell-primary, #0066cc);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 600;
    }

    .demo-user-info {
      flex: 1;
    }

    .demo-user-name {
      font-weight: 600;
      font-size: 16px;
      color: var(--shell-text-primary, #1a1a1a);
      margin-bottom: 4px;
    }

    .demo-user-email {
      font-size: 13px;
      color: var(--shell-text-secondary, #6b7280);
    }

    .demo-user-roles {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-top: 6px;
    }

    .demo-user-role {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--shell-bg-secondary, #f3f4f6);
      color: var(--shell-text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .demo-badge {
      display: inline-block;
      background: var(--shell-warning, #f59e0b);
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 4px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `;

  async connectedCallback() {
    super.connectedCallback();
    await this.initializeServices();

    // Listen for demo login event
    window.addEventListener('shell:show-demo-login', this.handleShowDemoLogin);
  }

  firstUpdated(): void {
    // Initialize iframe manager after first render when DOM is ready
    this.initializeIframeManager();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.cleanup();
    window.removeEventListener('shell:show-demo-login', this.handleShowDemoLogin);
  }

  private handleShowDemoLogin = (): void => {
    if (this.config.authProvider === 'demo') {
      this.showDemoLogin = true;
    }
  }

  private async handleDemoUserSelect(userId: string): Promise<void> {
    try {
      const user = await this.authService?.setDemoUser(userId);
      if (user) {
        this.user = user;
        this.showDemoLogin = false;
        this.auditService?.log('DEMO_LOGIN', { userId: user.id, name: user.name });
      }
    } catch (err) {
      console.error('[Shell] Demo login failed:', err);
    }
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

      ${this.showDemoLogin
        ? html`
            <div class="demo-modal-overlay" @click="${() => (this.showDemoLogin = false)}">
              <div class="demo-modal" @click="${(e: Event) => e.stopPropagation()}">
                <div class="demo-badge">Demo Mode</div>
                <h2>Select a Demo User</h2>
                <p>Choose a user to see different permission levels in action.</p>
                <div class="demo-users">
                  ${DEMO_USERS.map(
                    (demoUser) => html`
                      <div
                        class="demo-user-card"
                        @click="${() => this.handleDemoUserSelect(demoUser.id)}"
                      >
                        <div class="demo-user-avatar">
                          ${demoUser.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div class="demo-user-info">
                          <div class="demo-user-name">${demoUser.name}</div>
                          <div class="demo-user-email">${demoUser.email}</div>
                          <div class="demo-user-roles">
                            ${demoUser.roles.map(
                              (role) => html`<span class="demo-user-role">${role}</span>`
                            )}
                          </div>
                        </div>
                      </div>
                    `
                  )}
                </div>
              </div>
            </div>
          `
        : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-container': ShellContainer;
  }
}
