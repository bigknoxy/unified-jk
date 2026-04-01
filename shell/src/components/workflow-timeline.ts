/**
 * Workflow Timeline Component
 * Gantt-style visualization of cross-app workflows
 */

import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Workflow, WorkflowSpan } from '../services/workflow-tracker';

const APP_COLORS: Record<string, string> = {
  'sample-app': '#3b82f6',
  'api-explorer': '#8b5cf6',
  'dashboard': '#10b981',
  'admin-manager': '#f59e0b',
  'user-manager': '#ec4899',
  'default': '#6b7280'
};

@customElement('workflow-timeline')
export class WorkflowTimeline extends LitElement {
  @property({ type: Object }) workflow: Workflow | null = null;
  @state() private selectedSpan: WorkflowSpan | null = null;

  static styles = css`
    :host {
      display: block;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .header h3 {
      margin: 0;
      font-size: 16px;
      color: #1f2937;
    }
    .status-badge {
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-active { background: #dbeafe; color: #1e40af; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-abandoned { background: #fee2e2; color: #991b1b; }
    .summary {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .summary-item { text-align: center; }
    .summary-value { font-size: 18px; font-weight: 700; color: #111827; }
    .summary-label { font-size: 11px; color: #6b7280; text-transform: uppercase; }
    .timeline { position: relative; margin-bottom: 16px; }
    .timeline-row {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
    }
    .timeline-row:hover { background: #f9fafb; }
    .timeline-row.selected { background: #eff6ff; }
    .app-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .span-bar-container {
      flex: 1;
      height: 28px;
      background: #f3f4f6;
      border-radius: 6px;
      position: relative;
      overflow: hidden;
    }
    .span-bar {
      position: absolute;
      top: 2px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 11px;
      color: white;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .span-info {
      min-width: 120px;
      font-size: 12px;
      color: #374151;
    }
    .span-action { font-weight: 600; }
    .span-app { color: #6b7280; font-size: 11px; }
    .detail-panel {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-top: 12px;
    }
    .detail-panel h4 { margin: 0 0 8px; font-size: 14px; color: #1f2937; }
    .detail-row { display: flex; gap: 8px; margin-bottom: 4px; font-size: 13px; }
    .detail-label { color: #6b7280; min-width: 80px; }
    .detail-value { color: #111827; font-family: 'IBM Plex Mono', monospace; }
    .empty { text-align: center; padding: 40px; color: #6b7280; }
  `;

  private getAppColor(appId: string): string {
    return APP_COLORS[appId] ?? APP_COLORS.default;
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  private handleSpanClick(span: WorkflowSpan): void {
    this.selectedSpan = this.selectedSpan?.id === span.id ? null : span;
  }

  private getStatusClass(status: string): string {
    return `status-${status}`;
  }

  render() {
    if (!this.workflow) {
      return html`<div class="empty">No active workflow</div>`;
    }

    const wf = this.workflow;
    const totalDuration = wf.completedAt
      ? new Date(wf.completedAt).getTime() - new Date(wf.startedAt).getTime()
      : Date.now() - new Date(wf.startedAt).getTime();
    const uniqueApps = new Set(wf.spans.map(s => s.appId));

    return html`
      <div class="header">
        <h3>${wf.title}</h3>
        <span class="status-badge ${this.getStatusClass(wf.status)}">${wf.status}</span>
      </div>
      <div class="summary">
        <div class="summary-item">
          <div class="summary-value">${wf.spans.length}</div>
          <div class="summary-label">Steps</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${uniqueApps.size}</div>
          <div class="summary-label">Apps</div>
        </div>
        <div class="summary-item">
          <div class="summary-value">${this.formatDuration(totalDuration)}</div>
          <div class="summary-label">Duration</div>
        </div>
      </div>
      <div class="timeline">
        ${wf.spans.map((span, idx) => {
          const color = this.getAppColor(span.appId);
          const duration = span.endTime ? span.endTime - span.startTime : 500;
          const barWidth = Math.max(10, Math.min(100, (duration / Math.max(totalDuration, 1)) * 100));
          const isSelected = this.selectedSpan?.id === span.id;
          return html`
            <div class="timeline-row ${isSelected ? 'selected' : ''}" @click=${() => this.handleSpanClick(span)}>
              <div class="app-indicator" style="background: ${color}"></div>
              <div class="span-bar-container">
                <div class="span-bar" style="background: ${color}; left: ${idx * 2}%; width: ${barWidth}%">
                  ${span.action}
                </div>
              </div>
              <div class="span-info">
                <div class="span-action">${span.action}</div>
                <div class="span-app">${span.appId}</div>
              </div>
            </div>
          `;
        })}
      </div>
      ${this.selectedSpan ? html`
        <div class="detail-panel">
          <h4>Step Details</h4>
          <div class="detail-row">
            <span class="detail-label">Action:</span>
            <span class="detail-value">${this.selectedSpan.action}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">App:</span>
            <span class="detail-value">${this.selectedSpan.appId}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Resource:</span>
            <span class="detail-value">${this.selectedSpan.resource || '-'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Time:</span>
            <span class="detail-value">${new Date(this.selectedSpan.startTime).toLocaleTimeString()}</span>
          </div>
          ${this.selectedSpan.metadata ? html`
            <div class="detail-row">
              <span class="detail-label">Metadata:</span>
              <span class="detail-value">${JSON.stringify(this.selectedSpan.metadata)}</span>
            </div>
          ` : null}
        </div>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'workflow-timeline': WorkflowTimeline;
  }
}
