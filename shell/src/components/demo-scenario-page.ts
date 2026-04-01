/**
 * Demo Scenario Page — Industry showcase with guided walkthroughs
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { DemoScenario, WalkthroughStep } from '../services/demo-scenarios';

@customElement('demo-scenario-page')
export class DemoScenarioPage extends LitElement {
  @property({ type: Array }) scenarios: DemoScenario[] = [];
  @property({ type: Object }) activeScenario: DemoScenario | null = null;
  @property({ type: Object }) currentStep: WalkthroughStep | null = null;
  @property({ type: Boolean }) walkthroughActive = false;
  @property({ type: Number }) walkthroughCurrent = 1;
  @property({ type: Number }) walkthroughTotal = 1;
  @property({ type: String }) currentUserId = '';

  @state() private selectedScenarioId = '';

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow-y: auto;
      background: var(--shell-bg-secondary, #f8fafc);
    }

    .page-header {
      padding: 32px 48px 24px;
      border-bottom: 1px solid var(--shell-border-color, #e5e7eb);
      background: var(--shell-bg-primary, #ffffff);
    }

    .page-header h1 {
      font-size: 24px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 4px;
    }

    .page-header p {
      font-size: 14px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--shell-primary, #0066cc);
      cursor: pointer;
      margin-bottom: 12px;
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
    }

    .back-link:hover { text-decoration: underline; }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      padding: 32px 48px;
    }

    .scenario-card {
      border: 2px solid var(--shell-border-color, #e5e7eb);
      border-radius: 12px;
      padding: 24px;
      cursor: pointer;
      transition: all 0.2s;
      background: var(--shell-bg-primary, #ffffff);
    }

    .scenario-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
    }

    .scenario-card.active {
      border-color: var(--shell-primary, #0066cc);
      box-shadow: 0 0 0 1px var(--shell-primary, #0066cc);
    }

    .scenario-card-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .scenario-icon {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      flex-shrink: 0;
    }

    .scenario-card-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0;
    }

    .scenario-card p {
      font-size: 14px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0 0 16px;
      line-height: 1.5;
    }

    .compliance-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .compliance-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
      background: var(--shell-bg-secondary, #f3f4f6);
      color: var(--shell-text-secondary, #6b7280);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .scenario-meta {
      display: flex;
      gap: 16px;
      font-size: 13px;
      color: var(--shell-text-secondary, #6b7280);
    }

    .launch-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 8px 16px;
      background: var(--shell-primary, #0066cc);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    }

    .launch-btn:hover {
      background: var(--shell-primary-dark, #0055aa);
    }

    /* Detail panel */
    .detail-panel {
      padding: 32px 48px;
    }

    .detail-section {
      margin-bottom: 32px;
    }

    .detail-section h2 {
      font-size: 18px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 16px;
    }

    .roles-list {
      display: grid;
      gap: 12px;
    }

    .role-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: var(--shell-bg-primary, #ffffff);
      border: 1px solid var(--shell-border-color, #e5e7eb);
      border-radius: 10px;
    }

    .role-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--shell-primary, #0066cc);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .role-info { flex: 1; }

    .role-label {
      font-size: 15px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin-bottom: 4px;
    }

    .role-narrative {
      font-size: 13px;
      color: var(--shell-text-secondary, #6b7280);
      line-height: 1.5;
    }

    .role-action {
      padding: 6px 12px;
      background: var(--shell-bg-secondary, #f3f4f6);
      border: 1px solid var(--shell-border-color, #e5e7eb);
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: var(--shell-text-primary, #1a1a1a);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .role-action:hover {
      background: var(--shell-primary, #0066cc);
      color: white;
      border-color: var(--shell-primary, #0066cc);
    }

    .role-action.active-role {
      background: var(--shell-primary, #0066cc);
      color: white;
      border-color: var(--shell-primary, #0066cc);
    }

    /* Walkthrough overlay */
    .walkthrough-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: flex-end;
      justify-content: center;
      z-index: 10000;
      animation: overlay-in 0.2s ease-out;
    }

    @keyframes overlay-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .walkthrough-panel {
      background: var(--shell-bg-primary, #ffffff);
      border-radius: 16px 16px 0 0;
      padding: 32px;
      max-width: 520px;
      width: 100%;
      max-height: 80vh;
      box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.15);
      animation: slide-up 0.2s ease-out;
      overflow-y: auto;
    }

    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }

    .wt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .wt-progress {
      font-size: 13px;
      font-weight: 600;
      color: var(--shell-text-secondary, #6b7280);
    }

    .wt-close {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: var(--shell-text-secondary, #6b7280);
      padding: 4px 8px;
      border-radius: 4px;
    }

    .wt-close:hover {
      background: var(--shell-bg-secondary, #f3f4f6);
    }

    .wt-title {
      font-size: 20px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0 0 12px;
    }

    .wt-narrative {
      font-size: 14px;
      color: var(--shell-text-secondary, #6b7280);
      line-height: 1.6;
      margin: 0 0 16px;
    }

    .wt-observe {
      padding: 12px 16px;
      background: #eff6ff;
      border-left: 3px solid var(--shell-primary, #0066cc);
      border-radius: 0 8px 8px 0;
      font-size: 13px;
      color: #1e40af;
      margin-bottom: 24px;
    }

    .wt-observe strong {
      display: block;
      margin-bottom: 4px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .wt-actions {
      display: flex;
      justify-content: space-between;
      gap: 12px;
    }

    .wt-btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--shell-border-color, #e5e7eb);
      background: var(--shell-bg-primary, #ffffff);
      color: var(--shell-text-primary, #1a1a1a);
    }

    .wt-btn:hover { background: var(--shell-bg-secondary, #f3f4f6); }

    .wt-btn.primary {
      background: var(--shell-primary, #0066cc);
      color: white;
      border-color: var(--shell-primary, #0066cc);
    }

    .wt-btn.primary:hover {
      background: var(--shell-primary-dark, #0055aa);
    }

    .wt-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Walkthrough completion */
    .wt-complete {
      text-align: center;
      padding: 24px 0;
    }

    .wt-complete h3 {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 8px;
      color: var(--shell-text-primary, #1a1a1a);
    }

    .wt-complete p {
      font-size: 14px;
      color: var(--shell-text-secondary, #6b7280);
      margin: 0 0 24px;
    }

    @media (max-width: 768px) {
      .page-header, .scenarios-grid, .detail-panel {
        padding-left: 24px;
        padding-right: 24px;
      }
      .scenarios-grid {
        grid-template-columns: 1fr;
      }
    }
  `;

  private getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  private getScenarioIcon(scenario: DemoScenario): string {
    const icons: Record<string, string> = {
      healthcare: '🏥',
      finance: '💰',
      government: '🏛'
    };
    return icons[scenario.id] || '📋';
  }

  private getScenarioBg(scenario: DemoScenario): string {
    return scenario.color || '#f3f4f6';
  }

  private handleSelectScenario(scenarioId: string): void {
    this.selectedScenarioId = scenarioId;
    this.dispatchEvent(new CustomEvent('select-scenario', {
      detail: { scenarioId },
      bubbles: true,
      composed: true
    }));
  }

  private handleLaunchScenario(scenarioId: string): void {
    this.dispatchEvent(new CustomEvent('launch-scenario', {
      detail: { scenarioId },
      bubbles: true,
      composed: true
    }));
  }

  private handleStartWalkthrough(): void {
    this.dispatchEvent(new CustomEvent('start-walkthrough', {
      bubbles: true,
      composed: true
    }));
  }

  private handleNextStep(): void {
    this.dispatchEvent(new CustomEvent('walkthrough-next', {
      bubbles: true,
      composed: true
    }));
  }

  private handlePrevStep(): void {
    this.dispatchEvent(new CustomEvent('walkthrough-prev', {
      bubbles: true,
      composed: true
    }));
  }

  private handleExitWalkthrough(): void {
    this.dispatchEvent(new CustomEvent('exit-walkthrough', {
      bubbles: true,
      composed: true
    }));
  }

  private handleSwitchRole(userId: string): void {
    this.dispatchEvent(new CustomEvent('switch-user', {
      detail: { userId },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (this.walkthroughActive && this.currentStep) {
      return this.renderWalkthroughOverlay();
    }

    if (this.activeScenario) {
      return this.renderDetailPanel();
    }

    return this.renderScenarioGrid();
  }

  private renderScenarioGrid() {
    return html`
      <div class="page-header">
        <h1>Demo Showcase</h1>
        <p>See how Shell Platform works for regulated industries. Select a scenario to explore.</p>
      </div>
      <div class="scenarios-grid">
        ${this.scenarios.map(s => html`
          <div class="scenario-card ${this.selectedScenarioId === s.id ? 'active' : ''}"
               @click="${() => this.handleSelectScenario(s.id)}">
            <div class="scenario-card-header">
              <div class="scenario-icon" style="background: ${this.getScenarioBg(s)}">
                ${this.getScenarioIcon(s)}
              </div>
              <h3>${s.name}</h3>
            </div>
            <p>${s.description}</p>
            <div class="compliance-badges">
              ${s.compliance.map(c => html`<span class="compliance-badge">${c}</span>`)}
            </div>
            <div class="scenario-meta">
              <span>${s.roles.length} roles</span>
              <span>${s.apps.length} apps</span>
              <span>${s.walkthrough.length} steps</span>
            </div>
            <button class="launch-btn" @click="${(e: Event) => { e.stopPropagation(); this.handleLaunchScenario(s.id); }}">
              Launch Scenario →
            </button>
          </div>
        `)}
      </div>
    `;
  }

  private renderDetailPanel() {
    const s = this.activeScenario!;
    return html`
      <div class="page-header">
        <button class="back-link" @click="${() => this.dispatchEvent(new CustomEvent('back-to-scenarios', { bubbles: true, composed: true }))}">
          ← Back to Scenarios
        </button>
        <h1>${this.getScenarioIcon(s)} ${s.name}</h1>
        <p>${s.description}</p>
        <div class="compliance-badges" style="margin-top: 12px">
          ${s.compliance.map(c => html`<span class="compliance-badge">${c}</span>`)}
        </div>
      </div>
      <div class="detail-panel">
        <div class="detail-section">
          <h2>Roles</h2>
          <div class="roles-list">
            ${s.roles.map(r => html`
              <div class="role-item">
                <div class="role-avatar">${this.getInitials(r.roleLabel)}</div>
                <div class="role-info">
                  <div class="role-label">${r.roleLabel}</div>
                  <div class="role-narrative">${r.narrative}</div>
                </div>
                <button class="role-action ${this.currentUserId === r.userId ? 'active-role' : ''}"
                        @click="${() => this.handleSwitchRole(r.userId)}">
                  ${this.currentUserId === r.userId ? '✓ Active' : 'Switch'}
                </button>
              </div>
            `)}
          </div>
        </div>
        <div class="detail-section">
          <h2>Guided Walkthrough</h2>
          <p style="font-size:14px;color:var(--shell-text-secondary,#6b7280);margin:0 0 16px">
            A step-by-step tour through this scenario. Each step switches roles and highlights what to observe.
          </p>
          <button class="launch-btn" @click="${this.handleStartWalkthrough}">
            ▶ Start Walkthrough (${s.walkthrough.length} steps)
          </button>
        </div>
      </div>
    `;
  }

  private renderWalkthroughOverlay() {
    const step = this.currentStep!;
    const isLast = this.walkthroughCurrent >= this.walkthroughTotal;

    return html`
      <div class="walkthrough-overlay" @click="${this.handleExitWalkthrough}">
        <div class="walkthrough-panel" @click="${(e: Event) => e.stopPropagation()}">
          <div class="wt-header">
            <span class="wt-progress">Step ${this.walkthroughCurrent} of ${this.walkthroughTotal}</span>
            <button class="wt-close" @click="${this.handleExitWalkthrough}">✕</button>
          </div>

          ${isLast
            ? html`
                <div class="wt-complete">
                  <h3>Walkthrough Complete</h3>
                  <p>You've seen how Shell Platform handles ${this.activeScenario?.compliance[0] || 'compliance'} requirements. Want to try another scenario?</p>
                  <button class="wt-btn primary" @click="${this.handleExitWalkthrough}">
                    Back to Scenarios
                  </button>
                </div>
              `
            : html`
                <h2 class="wt-title">${step.title}</h2>
                <p class="wt-narrative">${step.narrative}</p>
                <div class="wt-observe">
                  <strong>Observe</strong>
                  ${step.observe}
                </div>
                <div class="wt-actions">
                  <button class="wt-btn" @click="${this.handlePrevStep}" ?disabled="${this.walkthroughCurrent <= 1}">
                    ← Previous
                  </button>
                  <button class="wt-btn primary" @click="${this.handleNextStep}">
                    ${step.userId ? 'Switch Role & Continue' : 'Next →'}
                  </button>
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'demo-scenario-page': DemoScenarioPage;
  }
}
