/**
 * Shell Navigation Component
 * Displays manifest-based dynamic navigation
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { NavItem } from '../types';

@customElement('shell-navigation')
export class ShellNavigation extends LitElement {
  @property({ type: Array }) items: NavItem[] = [];
  @property({ type: String }) activeAppId = '';
  @property({ type: Boolean }) collapsed = false;

  static styles = css`
    :host {
      display: block;
      width: 240px;
      height: 100%;
      background: var(--shell-bg-secondary, #f8fafc);
      border-right: 1px solid var(--shell-border-color, #e5e7eb);
      transition: width 0.2s ease;
    }

    :host([collapsed]) {
      width: 64px;
    }

    .nav {
      height: 100%;
      padding: 16px 0;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      margin: 0 8px;
      border-radius: 6px;
      cursor: pointer;
      font-family: var(--shell-font-family, Inter, sans-serif);
      font-size: 14px;
      color: var(--shell-text-secondary, #475569);
      text-decoration: none;
      transition: all 0.15s;
      white-space: nowrap;
      overflow: hidden;
    }

    .nav-item:hover {
      background: var(--shell-bg-hover, #e2e8f0);
      color: var(--shell-text-primary, #1a1a1a);
    }

    .nav-item.active {
      background: var(--shell-primary-light, #e6f0fa);
      color: var(--shell-primary, #0066cc);
      font-weight: 500;
    }

    .nav-item svg {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
    }

    .nav-label {
      opacity: 1;
      transition: opacity 0.2s;
    }

    :host([collapsed]) .nav-label {
      opacity: 0;
      width: 0;
    }

    .toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      margin: 0 16px 16px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      color: var(--shell-text-secondary, #475569);
      transition: all 0.15s;
    }

    .toggle-btn:hover {
      background: var(--shell-bg-hover, #e2e8f0);
    }

    :host([collapsed]) .toggle-btn {
      transform: rotate(180deg);
      margin: 0 16px;
    }

    .category {
      padding: 8px 20px;
      font-family: var(--shell-font-family, Inter, sans-serif);
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--shell-text-tertiary, #9ca3af);
      margin-top: 8px;
    }

    :host([collapsed]) .category {
      display: none;
    }

    .divider {
      height: 1px;
      background: var(--shell-border-color, #e5e7eb);
      margin: 8px 16px;
    }
  `;

  private handleNavClick(item: NavItem): void {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { item },
        bubbles: true,
        composed: true
      })
    );
  }

  private toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    this.dispatchEvent(
      new CustomEvent('collapse', {
        detail: { collapsed: this.collapsed },
        bubbles: true,
        composed: true
      })
    );
  }

  private renderIcon(iconName?: string): ReturnType<typeof html> {
    // Simple SVG icons - could be expanded
    const icons: Record<string, ReturnType<typeof html>> = {
      home: html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      `,
      settings: html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path
            d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"
          ></path>
        </svg>
      `,
      grid: html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      `,
      file: html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path
            d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"
          ></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `,
      chart: html`
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20V10M18 20V4M6 20v-4"></path>
        </svg>
      `
    };

    return icons[iconName || ''] || icons.grid;
  }

  render() {
    return html`
      <nav class="nav">
        <button class="toggle-btn" @click="${this.toggleCollapse}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"></path>
          </svg>
        </button>

        ${this.items.map((item) => html`
          <a
            class="nav-item ${this.activeAppId === item.appId ? 'active' : ''}"
            @click="${() => this.handleNavClick(item)}"
            href="javascript:void(0)"
          >
            ${this.renderIcon(item.icon)}
            <span class="nav-label">${item.label}</span>
          </a>
        `)}
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-navigation': ShellNavigation;
  }
}
