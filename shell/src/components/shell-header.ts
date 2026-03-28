/**
 * Shell Header Component
 * Displays title, logo, and user menu
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { User } from '../types';

@customElement('shell-header')
export class ShellHeader extends LitElement {
  @property({ type: String }) title = 'App Shell';
  @property({ type: String }) logo?: string;
  @property({ type: Object }) user?: User;
  @property({ type: Boolean }) menuOpen = false;

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
      min-width: 200px;
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

  render() {
    return html`
      <header class="header">
        <div class="brand">
          ${this.logo
            ? html`<img class="logo" src="${this.logo}" alt="" />`
            : null}
          <h1 class="title">${this.title}</h1>
        </div>

        <div class="actions">
          <slot name="actions"></slot>

          ${this.user
            ? html`
                <div class="user-menu">
                  <button class="user-button" @click="${this.toggleMenu}">
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
    document.addEventListener('click', (e) => {
      if (!this.contains(e.target as Node)) {
        this.closeMenu();
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'shell-header': ShellHeader;
  }
}
