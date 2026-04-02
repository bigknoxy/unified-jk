import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { AppManifest } from '../types';

@customElement('manifest-admin-panel')
export class ManifestAdminPanel extends LitElement {
  @property({ type: Array }) apps: AppManifest[] = [];
  @state() private expandedAppId = '';
  @state() private drafts: Record<string, Partial<AppManifest>> = {};

  static styles = css`
    :host {
      display: block;
      margin: 12px;
      border: 1px solid #dbe4f0;
      border-radius: 14px;
      background: linear-gradient(145deg, #f6fbff 0%, #eef7ff 100%);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
      overflow: hidden;
    }

    .header {
      padding: 14px 16px;
      border-bottom: 1px solid #d8e6f7;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      background: linear-gradient(90deg, #e7f4ff 0%, #f3fbff 100%);
    }

    .title {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      color: #0f3b5f;
    }

    .hint {
      margin: 0;
      font-size: 12px;
      color: #355f82;
    }

    .list {
      display: grid;
      gap: 10px;
      padding: 12px;
      max-height: 340px;
      overflow: auto;
    }

    .app-card {
      border: 1px solid #d6e5f5;
      border-radius: 12px;
      background: #ffffff;
      overflow: hidden;
    }

    .app-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px;
    }

    .identity {
      min-width: 0;
    }

    .name {
      font-size: 14px;
      font-weight: 700;
      color: #172b3f;
    }

    .meta {
      font-size: 12px;
      color: #5f7488;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 560px;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .chip {
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }

    .chip.enabled {
      background: #d7f9e2;
      color: #17663a;
    }

    .chip.disabled {
      background: #fee2e2;
      color: #a22020;
    }

    button {
      border: 1px solid #c5d9ed;
      background: #f8fcff;
      color: #183850;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 10px;
      cursor: pointer;
    }

    button:hover {
      background: #edf6ff;
    }

    .toggle {
      border-color: transparent;
      color: #ffffff;
      background: linear-gradient(135deg, #0f766e 0%, #155e75 100%);
    }

    .toggle.disable {
      background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    }

    .editor {
      padding: 12px;
      border-top: 1px solid #e8eff8;
      background: #f9fcff;
      display: grid;
      gap: 10px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(220px, 1fr));
      gap: 10px;
    }

    label {
      display: grid;
      gap: 4px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: #526a80;
      font-weight: 700;
    }

    input,
    textarea {
      font: inherit;
      font-size: 13px;
      color: #0f2740;
      border: 1px solid #c8d9ea;
      border-radius: 8px;
      padding: 8px 10px;
      background: #ffffff;
    }

    textarea {
      min-height: 56px;
      resize: vertical;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .save {
      border-color: transparent;
      color: #ffffff;
      background: linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%);
    }

    @media (max-width: 900px) {
      .grid {
        grid-template-columns: 1fr;
      }
      .meta {
        max-width: 300px;
      }
    }
  `;

  private isEnabled(app: AppManifest): boolean {
    return app.enabled !== false;
  }

  private getDraft(app: AppManifest): Partial<AppManifest> {
    return this.drafts[app.id] || {
      name: app.name,
      description: app.description,
      url: app.url,
      category: app.category,
      icon: app.icon,
      version: app.version,
      settings: app.settings || {}
    };
  }

  private setDraftValue(appId: string, key: keyof AppManifest, value: unknown): void {
    const draft = this.drafts[appId] || {};
    this.drafts = {
      ...this.drafts,
      [appId]: {
        ...draft,
        [key]: value
      }
    };
  }

  private toggleExpanded(app: AppManifest): void {
    if (this.expandedAppId === app.id) {
      this.expandedAppId = '';
      return;
    }
    this.expandedAppId = app.id;
    if (!this.drafts[app.id]) {
      this.setDraftValue(app.id, 'name', app.name);
      this.setDraftValue(app.id, 'description', app.description || '');
      this.setDraftValue(app.id, 'url', app.url);
      this.setDraftValue(app.id, 'category', app.category || '');
      this.setDraftValue(app.id, 'icon', app.icon || '');
      this.setDraftValue(app.id, 'version', app.version);
      this.setDraftValue(app.id, 'settings', app.settings || {});
    }
  }

  private emitPatch(id: string, changes: Partial<AppManifest>): void {
    this.dispatchEvent(
      new CustomEvent('manifest-update', {
        detail: { id, changes },
        bubbles: true,
        composed: true
      })
    );
  }

  private handleSave(app: AppManifest): void {
    const draft = this.getDraft(app);
    let settings: Record<string, unknown> = app.settings || {};
    if (typeof draft.settings === 'string') {
      try {
        settings = JSON.parse(draft.settings);
      } catch {
        this.dispatchEvent(
          new CustomEvent('manifest-error', {
            detail: { id: app.id, message: 'Invalid JSON in settings — reverted to previous value.' },
            bubbles: true,
            composed: true
          })
        );
        settings = app.settings || {};
      }
    } else if (draft.settings && typeof draft.settings === 'object') {
      settings = draft.settings as Record<string, unknown>;
    }

    this.emitPatch(app.id, {
      name: String(draft.name || app.name),
      description: String(draft.description || ''),
      url: String(draft.url || app.url),
      category: String(draft.category || ''),
      icon: String(draft.icon || ''),
      version: String(draft.version || app.version),
      settings
    });
  }

  private handleToggleEnabled(app: AppManifest): void {
    this.emitPatch(app.id, {
      enabled: !this.isEnabled(app)
    });
  }

  render() {
    return html`
      <section>
        <div class="header">
          <div>
            <p class="title">App Manifest Admin</p>
            <p class="hint">Edit app URL and metadata, or enable and disable apps live.</p>
          </div>
        </div>
        <div class="list">
          ${this.apps.map((app) => {
            const expanded = this.expandedAppId === app.id;
            const draft = this.getDraft(app);
            return html`
              <article class="app-card">
                <div class="app-row">
                  <div class="identity">
                    <div class="name">${app.name}</div>
                    <div class="meta">${app.id} • ${app.url}</div>
                  </div>
                  <div class="controls">
                    <span class="chip ${this.isEnabled(app) ? 'enabled' : 'disabled'}">
                      ${this.isEnabled(app) ? 'Enabled' : 'Disabled'}
                    </span>
                    <button class="toggle ${this.isEnabled(app) ? 'disable' : ''}" @click=${() => this.handleToggleEnabled(app)}>
                      ${this.isEnabled(app) ? 'Disable' : 'Enable'}
                    </button>
                    <button @click=${() => this.toggleExpanded(app)}>${expanded ? 'Close' : 'Edit'}</button>
                  </div>
                </div>

                ${expanded
                  ? html`
                      <div class="editor">
                        <div class="grid">
                          <label>
                            Name
                            <input
                              .value=${String(draft.name || '')}
                              @input=${(event: Event) => this.setDraftValue(app.id, 'name', (event.target as HTMLInputElement).value)}
                            />
                          </label>
                          <label>
                            URL
                            <input
                              .value=${String(draft.url || '')}
                              @input=${(event: Event) => this.setDraftValue(app.id, 'url', (event.target as HTMLInputElement).value)}
                            />
                          </label>
                          <label>
                            Category
                            <input
                              .value=${String(draft.category || '')}
                              @input=${(event: Event) => this.setDraftValue(app.id, 'category', (event.target as HTMLInputElement).value)}
                            />
                          </label>
                          <label>
                            Icon
                            <input
                              .value=${String(draft.icon || '')}
                              @input=${(event: Event) => this.setDraftValue(app.id, 'icon', (event.target as HTMLInputElement).value)}
                            />
                          </label>
                          <label>
                            Version
                            <input
                              .value=${String(draft.version || '')}
                              @input=${(event: Event) => this.setDraftValue(app.id, 'version', (event.target as HTMLInputElement).value)}
                            />
                          </label>
                        </div>
                        <label>
                          Description
                          <textarea
                            .value=${String(draft.description || '')}
                            @input=${(event: Event) => this.setDraftValue(app.id, 'description', (event.target as HTMLTextAreaElement).value)}
                          ></textarea>
                        </label>
                        <label>
                          Settings JSON
                          <textarea
                            .value=${JSON.stringify(draft.settings || {}, null, 2)}
                            @input=${(event: Event) => this.setDraftValue(app.id, 'settings', (event.target as HTMLTextAreaElement).value)}
                          ></textarea>
                        </label>
                        <div class="actions">
                          <button @click=${() => this.toggleExpanded(app)}>Cancel</button>
                          <button class="save" @click=${() => this.handleSave(app)}>Save changes</button>
                        </div>
                      </div>
                    `
                  : null}
              </article>
            `;
          })}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'manifest-admin-panel': ManifestAdminPanel;
  }
}
