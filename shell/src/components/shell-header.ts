/**
 * Shell Header Component
 * Displays title, logo, and user menu
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { User } from '../types';
import { DEMO_USERS } from '../types';

@customElement('shell-header')
export class ShellHeader extends LitElement {
  @property({ type: String }) title = 'App Shell';
  @property({ type: String }) logo?: string;
  @property({ type: Object }) user?: User;
  @property({ type: Boolean }) menuOpen = false;
  @property({ type: Boolean }) isDemoMode = false;

  static styles = css`
    :host {
      display: block;
      height: 64px;
      background: var(--shell-bg-primary, #ffffff);
      border-bottom: 1px solid var(--shell-border-color, #e5e7eb);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      padding: 0 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .home-button {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 12px;
      margin: -6px -12px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
      text-decoration: none;
    }

    .home-button:hover {
      background: var(--shell-bg-secondary, #f3f4f6);
    }

    .home-button:active {
      background: var(--shell-bg-tertiary, #e5e7eb);
    }

    .turtle-icon {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }

    .logo {
      height: 32px;
      width: auto;
    }

    .title {
      font-family: var(--shell-font-family, Inter, sans-serif);
      font-size: 20px;
      font-weight: 600;
      color: var(--shell-text-primary, #1a1a1a);
      margin: 0;
    }

    .actions {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-menu {
      position: relative;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      font-family: var(--shell-font-family, Inter, sans-serif);
      font-size: 14px;
      color: var(--shell-text-primary, #1a1a1a);
      transition: background 0.15s;
    }

    .user-button:hover {
      background: var(--shell-bg-secondary, #f3f4f6);
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--shell-primary, #0066cc);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 8px;
      min-width: 240px;
      background: var(--shell-bg-primary, #ffffff);
      border: 1px solid var(--shell-border-color, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      z-index: 100;
      display: none;
    }

    .dropdown.open {
      display: block;
    }

    .role-switcher-section {
      padding: 8px 0;
    }

    .role-switcher-label {
      padding: 4px 16px 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--shell-text-secondary, #6b7280);
    }

    .role-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 16px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .role-item:hover {
      background: var(--shell-bg-secondary, #f3f4f6);
    }

    .role-item.active {
      background: var(--shell-bg-secondary, #eff6ff);
    }

    .role-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--shell-primary, #0066cc);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .role-info {
      flex: 1;
      min-width: 0;
    }

    .role-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--shell-text-primary, #1a1a1a);
    }

    .role-badge {
      font-size: 11px;
      color: var(--shell-text-secondary, #6b7280);
    }

    .role-check {
      width: 16px;
      height: 16px;
      color: var(--shell-primary, #0066cc);
      flex-shrink: 0;
    }

    .dropdown-divider {
      height: 1px;
      background: var(--shell-border-color, #e5e7eb);
      margin: 0;
    }

    .dropdown-item {
      padding: 12px 16px;
      font-family: var(--shell-font-family, Inter, sans-serif);
      font-size: 14px;
      color: var(--shell-text-primary, #1a1a1a);
      cursor: pointer;
      transition: background 0.15s;
    }

    .dropdown-item:hover {
      background: var(--shell-bg-secondary, #f3f4f6);
    }

    .dropdown-item:first-child {
      border-radius: 8px 8px 0 0;
    }

    .dropdown-item:last-child {
      border-radius: 0 0 8px 8px;
      color: var(--shell-error, #dc2626);
    }

    .user-info {
      padding: 12px 16px;
      border-bottom: 1px solid var(--shell-border-color, #e5e7eb);
    }

    .user-name {
      font-weight: 600;
      margin-bottom: 2px;
    }

    .user-email {
      font-size: 12px;
      color: var(--shell-text-secondary, #6b7280);
    }
  `;

  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  private closeMenu(): void {
    this.menuOpen = false;
  }

  private handleLogout(): void {
    this.dispatchEvent(new CustomEvent('logout', { bubbles: true, composed: true }));
    this.closeMenu();
  }

  private handleSwitchRole(userId: string): void {
    this.dispatchEvent(new CustomEvent('switch-user', {
      detail: { userId },
      bubbles: true,
      composed: true
    }));
    this.closeMenu();
  }

  private handleHomeClick(): void {
    this.dispatchEvent(new CustomEvent('home', { bubbles: true, composed: true }));
  }

  // Document click handler - defined as property so it can be removed
  private handleDocumentClick = (e: MouseEvent): void => {
    if (!this.contains(e.target as Node)) {
      this.closeMenu();
    }
  };

  private renderTurtleIcon(): ReturnType<typeof html> {
    const primary = getComputedStyle(document.documentElement).getPropertyValue('--shell-primary').trim() || '#0066cc';
    return html`
      <svg class="turtle-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="24" cy="28" rx="14" ry="11" fill="${primary}" opacity="0.15"/>
        <ellipse cx="24" cy="28" rx="14" ry="11" stroke="${primary}" stroke-width="2" fill="none"/>
        <path d="M14 28 C14 20, 20 16, 24 16 C28 16, 34 20, 34 28" stroke="${primary}" stroke-width="2" fill="none"/>
        <line x1="18" y1="20" x2="18" y2="36" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
        <line x1="24" y1="17" x2="24" y2="39" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
        <line x1="30" y1="20" x2="30" y2="36" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
        <line x1="10" y1="24" x2="38" y2="24" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
        <line x1="10" y1="30" x2="38" y2="30" stroke="${primary}" stroke-width="1.5" opacity="0.5"/>
        <circle cx="24" cy="12" r="4" fill="${primary}" opacity="0.2"/>
        <circle cx="24" cy="12" r="4" stroke="${primary}" stroke-width="1.5"/>
        <circle cx="22.5" cy="11" r="1" fill="${primary}"/>
        <circle cx="25.5" cy="11" r="1" fill="${primary}"/>
        <path d="M10 28 C6 26, 4 28, 4 30" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M38 28 C42 26, 44 28, 44 30" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M16 38 C14 40, 12 42, 12 42" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M20 39 C19 41, 18 42, 18 42" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M28 39 C29 41, 30 42, 30 42" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
        <path d="M32 38 C34 40, 36 42, 36 42" stroke="${primary}" stroke-width="2" stroke-linecap="round" fill="none"/>
      </svg>
    `;
  }

  render() {
    return html`
      <header class="header">
        <div class="brand">
          <button class="home-button" @click="${this.handleHomeClick}" title="Home">
            ${this.logo
              ? html`<img class="logo" src="${this.logo}" alt="" />`
              : this.renderTurtleIcon()}
            <h1 class="title">${this.title}</h1>
          </button>
        </div>

        <div class="actions">
          <slot name="actions"></slot>
          ${this.user
            ? html`
                <div class="user-menu">
                  <button class="user-button" @click="${(e: Event) => { e.stopPropagation(); this.toggleMenu(); }}">
                    <span class="avatar">${this.getInitials(this.user.name)}</span>
                    <span>${this.user.name}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 4.5L6 8L9.5 4.5"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </button>

                  <div class="dropdown ${this.menuOpen ? 'open' : ''}">
                    <div class="user-info">
                      <div class="user-name">${this.user.name}</div>
                      <div class="user-email">${this.user.email}</div>
                    </div>
                    ${this.isDemoMode ? html`
                      <div class="role-switcher-section">
                        <div class="role-switcher-label">Switch Role</div>
                        ${DEMO_USERS.filter(u => u.id !== this.user?.id).map(u => html`
                          <div class="role-item" @click="${() => this.handleSwitchRole(u.id)}">
                            <span class="role-avatar">${this.getInitials(u.name)}</span>
                            <div class="role-info">
                              <div class="role-name">${u.name}</div>
                              <div class="role-badge">${u.roles.join(', ')}</div>
                            </div>
                          </div>
                        `)}
                      </div>
                    ` : ''}
                    <div class="dropdown-divider"></div>
                    <div class="dropdown-item" @click="${this.handleLogout}">
                      Sign out
                    </div>
                  </div>
                </div>
              `
            : html`
                <button class="user-button" @click="${() =>
                  this.dispatchEvent(
                    new CustomEvent('login', { bubbles: true, composed: true })
                  )}">
                  Sign in
                </button>
              `}
        </div>
      </header>
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    // Close menu when clicking outside
    document.addEventListener('click', this.handleDocumentClick);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Clean up document click listener
    document.removeEventListener('click', this.handleDocumentClick);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-header': ShellHeader;
  }
}
