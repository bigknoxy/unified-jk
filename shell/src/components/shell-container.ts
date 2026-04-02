/**
 * Shell Container Component
 * Main orchestrator that manages layout, iframes, and lifecycle
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AppManifest, User, Theme, NavItem, ShellConfig } from '../types';
import { DEMO_USERS } from '../types';
import type { Workflow } from '../services/workflow-tracker';
import { getScenario } from '../services/demo-scenarios';
import { DemoController } from '../services/demo-controller';
import { initializeAuth } from '../services/auth';
import { initializeAudit } from '../services/audit';
import { MessageHandlerService } from '../services/message-handler';
import { IframeManager } from '../services/iframe-manager';
import { WorkflowTracker } from '../services/workflow-tracker';
import './shell-header';
import './shell-navigation';
import './workflow-timeline';
import './demo-scenario-page';
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
  @state() private activeWorkflow: Workflow | null = null;
  @state() private showDemoShowcase = false;

  private authService?: ReturnType<typeof initializeAuth>;
  private auditService?: ReturnType<typeof initializeAudit>;
  private messageHandler?: MessageHandlerService;
  private iframeManager?: IframeManager;
  private workflowTracker = new WorkflowTracker();
  private sharedState = new Map<string, unknown>();
  private demoController = new DemoController();

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

    .landing-page {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      background: linear-gradient(135deg, var(--shell-bg-primary, #ffffff) 0%, var(--shell-bg-secondary, #f8fafc) 50%, #e8f4f8 100%);
    }

    .landing-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 120px 24px 60px;
      position: relative;
      overflow: hidden;
    }

    .landing-hero::before {
      content: '';
      position: absolute;
      top: -100px;
      right: -100px;
      width: 400px;
      height: 400px;
      background: radial-gradient(circle, var(--shell-primary, #0066cc) 0%, transparent 70%);
      opacity: 0.06;
      border-radius: 50%;
    }

    .landing-hero::after {
      content: '';
      position: absolute;
      bottom: -80px;
      left: -80px;
      width: 300px;
      height: 300px;
      background: radial-gradient(circle, var(--shell-secondary, #64748b) 0%, transparent 70%);
      opacity: 0.05;
      border-radius: 50%;
    }

    .landing-turtle {
      width: 96px;
      height: 96px;
      margin-bottom: 32px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .landing-title {
      font-size: 48px;
      font-weight: 700;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 16px;
      letter-spacing: -0.02em;
      line-height: 1.1;
    }

    .landing-subtitle {
      font-size: 20px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0 0 40px;
      max-width: 560px;
      line-height: 1.6;
    }

    .landing-cta-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .landing-cta-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: var(--shell-primary, #0066cc);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
    }

    .landing-cta-primary:hover {
      background: var(--shell-primary-dark, #0055aa);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 102, 204, 0.4);
    }

    .landing-cta-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 32px;
      background: transparent;
      color: var(--shell-text-primary, #1a1a1a);
      border: 2px solid var(--shell-border-color, #e5e7eb);
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .landing-cta-secondary:hover {
      border-color: var(--shell-primary, #0066cc);
      color: var(--shell-primary, #0066cc);
    }

    .landing-features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      padding: 60px 48px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .landing-feature-card {
      background: var(--shell-bg-primary, #ffffff);
      border: 1px solid var(--shell-border-color, #e5e7eb);
      border-radius: 12px;
      padding: 32px;
      transition: all 0.2s;
    }

    .landing-feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08);
      border-color: var(--shell-primary, #0066cc);
    }

    .landing-feature-icon {
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: var(--shell-primary, #0066cc);
    }

    .landing-feature-title {
      font-size: 18px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 8px;
    }

    .landing-feature-desc {
      font-size: 14px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0;
      line-height: 1.6;
    }

    .landing-apps-section {
      padding: 40px 48px 60px;
      max-width: 1200px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .landing-apps-title {
      font-size: 24px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 24px;
      text-align: center;
    }

    .landing-apps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .landing-app-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 24px 16px;
      background: var(--shell-bg-primary, #ffffff);
      border: 1px solid var(--shell-border-color, #e5e7eb);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .landing-app-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
      border-color: var(--shell-primary, #0066cc);
    }

    .landing-app-icon {
      width: 40px;
      height: 40px;
      margin-bottom: 12px;
      color: var(--shell-primary, #0066cc);
    }

    .landing-app-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 4px;
    }

    .landing-app-desc {
      font-size: 12px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0;
    }

    .landing-footer {
      text-align: center;
      padding: 32px 24px;
      color: var(--shell-text-secondary, #6b7280);
      font-size: 13px;
      border-top: 1px solid var(--shell-border-color, #e5e7eb);
    }

    .home-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--shell-text-secondary, #6b7280);
      text-align: center;
      padding: 48px;
    }

    .home-state h2 {
      margin: 0 0 8px;
      font-size: 20px;
      color: var(--shell-text-primary, #1a1a1a);
    }

    .home-state p {
      margin: 0;
      font-size: 14px;
    }

    .toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      animation: toast-in 0.2s ease-out;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .toast.toast-success {
      background: var(--shell-bg-primary, #ffffff);
      color: var(--shell-text-primary, #1a1a1a);
      border: 1px solid var(--shell-border-color, #e5e7eb);
    }

    .toast.toast-error {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    @keyframes toast-in {
      from { opacity: 0; transform: translateX(-50%) translateY(8px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
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

  protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
    // On initial load, firstUpdated runs while loading UI is still shown.
    // Retry iframe manager initialization once the main shell layout renders.
    if (changedProperties.has('isLoading') && !this.isLoading) {
      this.initializeIframeManager();
    }
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
        await this.fetchAndApplyApps();
        this.auditService?.log('DEMO_LOGIN', { userId: user.id, name: user.name });
      }
    } catch (err) {
      console.error('[Shell] Demo login failed:', err);
    }
  }

  private async fetchAndApplyApps(): Promise<void> {
    try {
      if (!this.authService) return;
      const user = this.authService.getUser();
      const permissions = user?.permissions?.join(',');
      const internalApiKey = (window as unknown as { SHELL_API_KEY?: string }).SHELL_API_KEY || 'dev-key-123';
      const canSeeDisabled = this.authService.hasPermission('admin:read') || this.authService.hasPermission('admin:write');
      const manifestUrl = canSeeDisabled ? '/api/manifests?includeDisabled=true' : '/api/manifests';
      const headers: Record<string, string> = {
        'x-api-key': internalApiKey
      };
      if (permissions) {
        headers['x-user-permissions'] = permissions;
      }

      const response = await fetch(manifestUrl, {
        headers
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch manifests: ${response.status}`);
      }
      const data = await response.json();
      this.apps = data.manifests || [];
    } catch (error) {
      console.error('[Shell] Failed to refresh manifests:', error);
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
        onNavigate: (path) => {
          this.handleNavigation(path);
        },
        onSharedStateUpdate: (key, value) => {
          this.sharedState.set(key, value);
          if (key === 'manifests:version') {
            void this.fetchAndApplyApps();
          }
        },
        getActiveWorkflowId: () => this.workflowTracker.getActiveWorkflowId(),
        onWorkflowEvent: (event) => {
          this.workflowTracker.recordSpan(event);
          this.workflowTracker.setActiveWorkflow(event.workflowId);
          const wf = this.workflowTracker.getWorkflow(event.workflowId);
          if (wf) this.activeWorkflow = wf;
        }
      });

      await this.fetchAndApplyApps();

      this.isLoading = false;
    } catch (err) {
      console.error('[Shell] Initialization failed:', err);
      this.error = 'Failed to initialize shell. Please refresh and try again.';
      this.isLoading = false;
    }
  }

  private initializeIframeManager(): void {
    if (this.iframeManager) return; // Already initialized

    const iframeContainer = this.shadowRoot?.querySelector('.iframe-container');
    if (!iframeContainer) return;

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

  private async handleSwitchUser(event: CustomEvent<{ userId: string }>): Promise<void> {
    try {
      const user = await this.authService?.switchUser(event.detail.userId);
      if (user) {
        this.user = user;
        this.activeAppId = '';
        this.iframeManager?.destroy();
    const activeScenario = this.demoController.getActiveScenario();
    if (activeScenario) {
      this.apps = activeScenario.apps.filter(a =>
            user.permissions.some(p => a.permissions.includes(p)) || a.permissions.length === 0
          );
        } else {
          await this.fetchAndApplyApps();
        }
        this.auditService?.log('ROLE_SWITCH', {
          userId: user.id,
          name: user.name,
          appCount: this.apps.length
        });
        this.showToast(`Switched to ${user.name} — ${this.apps.length} app${this.apps.length !== 1 ? 's' : ''} available`);
      }
    } catch (err) {
      console.error('[Shell] Role switch failed:', err);
      this.showToast('Failed to switch role', true);
    }
  }

  @state() private toastMessage = '';
  @state() private toastVisible = false;
  @state() private toastError = false;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private showToast(message: string, isError = false): void {
    this.toastMessage = message;
    this.toastError = isError;
    this.toastVisible = true;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }

  /* ---- Demo Showcase ---- */
  private handleOpenDemoShowcase(): void {
    this.showDemoShowcase = true;
    this.activeAppId = '';
    this.iframeManager?.destroy();
  }

  private handleBackToScenarios(): void {
    this.demoController.deactivateScenario();
    void this.fetchAndApplyApps();
  }

  private async handleSelectScenario(event: CustomEvent<{ scenarioId: string }>): Promise<void> {
    const scenario = this.demoController.activateScenario(event.detail.scenarioId);
    if (scenario) {
      this.apps = scenario.apps;
    }
  }

  private async handleLaunchScenario(event: CustomEvent<{ scenarioId: string }>): Promise<void> {
    const scenario = getScenario(event.detail.scenarioId);
    if (!scenario || !scenario.roles.length) return;
    this.demoController.activateScenario(event.detail.scenarioId);
    this.demoController.setOriginalUser(this.user);
    this.apps = scenario.apps;
    const firstRole = scenario.roles[0];
    await this.authService?.switchUser(firstRole.userId);
    this.user = this.authService?.getUser() || null;
    this.activeAppId = '';
    this.iframeManager?.destroy();
    this.auditService?.log('SCENARIO_LAUNCH', {
      scenarioId: scenario.id,
      userId: this.user?.id
    });
  }

  private handleStartWalkthrough(): void {
    this.demoController.startWalkthrough();
  }

  private async handleWalkthroughNext(): Promise<void> {
    const step = this.demoController.nextStep();
    const scenario = this.demoController.getActiveScenario();
    if (scenario) {
      const stepData = scenario.walkthrough[step];
      if (stepData?.userId) {
        await this.authService?.switchUser(stepData.userId);
        this.user = this.authService?.getUser() || null;
        this.activeAppId = '';
        this.iframeManager?.destroy();
      }
    }
  }

  private async handleWalkthroughPrev(): Promise<void> {
    const step = this.demoController.prevStep();
    const scenario = this.demoController.getActiveScenario();
    if (scenario) {
      const stepData = scenario.walkthrough[step];
      if (stepData?.userId) {
        await this.authService?.switchUser(stepData.userId);
        this.user = this.authService?.getUser() || null;
        this.activeAppId = '';
        this.iframeManager?.destroy();
      }
    }
  }

  private handleExitWalkthrough(): void {
    this.demoController.exitWalkthrough();
  }

  private handleDemoShowcaseSwitchUser(event: CustomEvent<{ userId: string }>): void {
    void this.handleSwitchUser(event);
  }

  private async handleNavigation(
    event: CustomEvent<{ item: NavItem }> | string,
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

    if (manifest.enabled === false) {
      console.warn(`[Shell] App is disabled: ${appId}`);
      return;
    }

    // Check permissions
    if (!this.authService?.hasAnyPermission(manifest.permissions)) {
      console.warn(`[Shell] User lacks permissions for app: ${appId}`);
      return;
    }

    this.activeAppId = appId;

    // Register origin BEFORE mounting the app to avoid race condition
    // The iframe will send SHELL_INIT immediately on load
    try {
      const url = new URL(manifest.url);
      this.messageHandler?.registerOrigin(url.origin);
    } catch {
      console.warn('[Shell] Invalid app URL:', manifest.url);
    }

    // Mount the app
    await this.iframeManager?.mountApp(manifest);
  }

  private handleNavCollapse(event: CustomEvent<{ collapsed: boolean }>): void {
    this.navCollapsed = event.detail.collapsed;
  }

  private handleHome(): void {
    this.activeAppId = '';
    if (this.iframeManager) {
      this.iframeManager.destroy();
      this.iframeManager = undefined;
      this.initializeIframeManager();
    }
  }

  get navigationItems(): NavItem[] {
    return this.apps
      .filter((app) => {
        if (app.enabled === false) {
          return false;
        }
        return this.authService?.hasAnyPermission(app.permissions);
      })
      .map((app) => ({
        id: app.id,
        label: app.name,
        icon: app.icon || 'grid',
        appId: app.id
      }));
  }

  get isAdmin(): boolean {
    return this.authService?.hasPermission('admin:write') ?? false;
  }

  get canManageApps(): boolean {
    return this.authService?.hasPermission('admin:manage') ?? false;
  }

  get canViewAudit(): boolean {
    return this.authService?.hasPermission('audit:read') ?? false;
  }

  private renderTurtleIconLarge(): ReturnType<typeof html> {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--shell-primary').trim() || '#0066cc';
    return html`
      <svg class="landing-turtle" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="48" cy="56" rx="28" ry="22" fill="${primary}" opacity="0.1"/>
        <ellipse cx="48" cy="56" rx="28" ry="22" stroke="${primary}" stroke-width="3" fill="none"/>
        <path d="M28 56 C28 40, 40 32, 48 32 C56 32, 68 40, 68 56" stroke="${primary}" stroke-width="3" fill="none"/>
        <line x1="36" y1="40" x2="36" y2="72" stroke="${primary}" stroke-width="2.5" opacity="0.4"/>
        <line x1="48" y1="34" x2="48" y2="78" stroke="${primary}" stroke-width="2.5" opacity="0.4"/>
        <line x1="60" y1="40" x2="60" y2="72" stroke="${primary}" stroke-width="2.5" opacity="0.4"/>
        <line x1="20" y1="48" x2="76" y2="48" stroke="${primary}" stroke-width="2.5" opacity="0.4"/>
        <line x1="20" y1="60" x2="76" y2="60" stroke="${primary}" stroke-width="2.5" opacity="0.4"/>
        <circle cx="48" cy="24" r="8" fill="${primary}" opacity="0.15"/>
        <circle cx="48" cy="24" r="8" stroke="${primary}" stroke-width="2.5"/>
        <circle cx="45" cy="22" r="2" fill="${primary}"/>
        <circle cx="51" cy="22" r="2" fill="${primary}"/>
        <path d="M44 27 Q48 30 52 27" stroke="${primary}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M20 56 C12 52, 8 56, 8 60" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M76 56 C84 52, 88 56, 88 60" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M32 76 C28 80, 24 84, 24 84" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M40 78 C38 82, 36 84, 36 84" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M56 78 C58 82, 60 84, 60 84" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M64 76 C68 80, 72 84, 72 84" stroke="${primary}" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>
    `;
  }

  private renderFeatureIcon(type: string): ReturnType<typeof html> {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--shell-primary').trim() || '#0066cc';
    switch (type) {
      case 'shield':
        return html`
          <svg class="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        `;
      case 'grid':
        return html`
          <svg class="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
        `;
      case 'zap':
        return html`
          <svg class="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        `;
      default:
        return html`
          <svg class="landing-feature-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
          </svg>
        `;
    }
  }

  private renderAppIcon(iconName?: string): ReturnType<typeof html> {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--shell-primary').trim() || '#0066cc';
    const icons: Record<string, ReturnType<typeof html>> = {
      chart: html`
        <svg class="landing-app-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
          <path d="M12 20V10M18 20V4M6 20v-4"/>
        </svg>
      `,
      file: html`
        <svg class="landing-app-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      `,
      settings: html`
        <svg class="landing-app-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
        </svg>
      `,
      grid: html`
        <svg class="landing-app-icon" viewBox="0 0 24 24" fill="none" stroke="${primary}" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"/>
          <rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/>
          <rect x="3" y="14" width="7" height="7"/>
        </svg>
      `
    };
    return icons[iconName || ''] || icons.grid;
  }

  private handleAppLaunch(appId: string): void {
    const manifest = this.apps.find((a) => a.id === appId);
    if (!manifest) return;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { item: { id: appId, label: manifest.name, appId, icon: manifest.icon } },
        bubbles: true,
        composed: true
      })
    );
  }

  private renderLandingPage(): ReturnType<typeof html> {
    return html`
      <div class="landing-page">
        <div class="landing-hero">
          ${this.renderTurtleIconLarge()}
          <h1 class="landing-title">App Shell Platform</h1>
          <p class="landing-subtitle">
            A modular micro-frontend orchestration system. Securely sandbox apps, manage permissions, and ship features independently.
          </p>
          <div class="landing-cta-group">
            <button class="landing-cta-primary" @click="${this.handleLogin}">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In
            </button>
            <button class="landing-cta-secondary" @click="${() => {
              const el = this.shadowRoot?.querySelector('.landing-features');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}">
              Learn More
            </button>
          </div>
        </div>

        <div class="landing-features">
          <div class="landing-feature-card">
            ${this.renderFeatureIcon('shield')}
            <h3 class="landing-feature-title">Secure Sandboxing</h3>
            <p class="landing-feature-desc">
              Every app runs in an isolated iframe with strict security boundaries. No shared state, no cross-app interference.
            </p>
          </div>
          <div class="landing-feature-card">
            ${this.renderFeatureIcon('grid')}
            <h3 class="landing-feature-title">Modular Architecture</h3>
            <p class="landing-feature-desc">
              Plug in apps dynamically via manifest registry. Add, remove, or update apps without redeploying the shell.
            </p>
          </div>
          <div class="landing-feature-card">
            ${this.renderFeatureIcon('zap')}
            <h3 class="landing-feature-title">Permission-Based Access</h3>
            <p class="landing-feature-desc">
              Fine-grained permissions control which apps each user sees. Role-based access out of the box.
            </p>
          </div>
        </div>

        ${this.apps.length > 0
          ? html`
              <div class="landing-apps-section">
                <h2 class="landing-apps-title">Available Applications</h2>
                <div class="landing-apps-grid">
                  ${this.apps.filter((a) => a.enabled !== false).map((app) => html`
                    <div class="landing-app-card" @click="${() => this.handleAppLaunch(app.id)}">
                      ${this.renderAppIcon(app.icon)}
                      <div class="landing-app-name">${app.name}</div>
                      <div class="landing-app-desc">${app.description || ''}</div>
                    </div>
                  `)}
                </div>
              </div>
            `
          : null}

        <div class="landing-footer">
          Shell Platform &middot; &copy; ${new Date().getFullYear()}
        </div>
      </div>
    `;
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
          .isDemoMode="${this.config.authProvider === 'demo'}"
          @login="${this.handleLogin}"
          @logout="${this.handleLogout}"
          @home="${this.handleHome}"
          @switch-user="${this.handleSwitchUser}"
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
            ${this.activeWorkflow
              ? html`
                  <workflow-timeline
                    .workflow="${this.activeWorkflow}"
                  ></workflow-timeline>
                `
              : null}
            <div class="iframe-container">
              ${this.showDemoShowcase
                ? html`
                    <demo-scenario-page
                      .scenarios="${this.demoController.getAllScenarios()}"
                      .activeScenario="${this.demoController.getActiveScenario()}"
                      .currentStep="${this.demoController.getCurrentStep()}"
                      .walkthroughActive="${this.demoController.isWalkthroughActive()}"
                      .walkthroughCurrent="${this.demoController.getWalkthroughProgress().current}"
                      .walkthroughTotal="${this.demoController.getWalkthroughProgress().total}"
                      .currentUserId="${this.user?.id || ''}"
                      @select-scenario="${this.handleSelectScenario}"
                      @launch-scenario="${this.handleLaunchScenario}"
                      @back-to-scenarios="${this.handleBackToScenarios}"
                      @start-walkthrough="${this.handleStartWalkthrough}"
                      @walkthrough-next="${this.handleWalkthroughNext}"
                      @walkthrough-prev="${this.handleWalkthroughPrev}"
                      @exit-walkthrough="${this.handleExitWalkthrough}"
                      @switch-user="${this.handleDemoShowcaseSwitchUser}"
                    ></demo-scenario-page>
                  `
                : this.activeAppId
                  ? null
                  : this.user
                    ? html`
                        <div class="home-state">
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
                          <h2>Welcome back, ${this.user.name.split(' ')[0]}</h2>
                          <p>Choose an application from the sidebar to begin working.</p>
                          ${this.config.authProvider === 'demo'
                            ? html`
                                <button class="landing-cta-secondary" style="margin-top:24px" @click="${this.handleOpenDemoShowcase}">
                                  Open Demo Showcase
                                </button>
                              `
                            : null}
                        </div>
                      `
                    : this.renderLandingPage()}
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

      ${this.toastVisible
        ? html`
            <div class="toast ${this.toastError ? 'toast-error' : 'toast-success'}">
              ${this.toastMessage}
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
