/**
 * Iframe Manager Service
 * Manages iframe lifecycle with LRU cache (max 3 open apps)
 */

import type { AppManifest, IframeState } from '../types';
import { LRUCache } from '../utils/lru-cache';

interface IframeManagerConfig {
  maxIframes: number;
  container: HTMLElement;
  onAppActivate: (appId: string) => void;
  onAppDeactivate: (appId: string) => void;
}

export class IframeManager {
  private config: IframeManagerConfig;
  private cache: LRUCache<IframeState>;
  private activeAppId: string | null = null;

  constructor(config: IframeManagerConfig) {
    this.config = config;

    // Initialize LRU cache with eviction callback
    this.cache = new LRUCache<IframeState>(config.maxIframes);
    this.cache.onEvict = this.handleEviction.bind(this);
  }

  async mountApp(manifest: AppManifest): Promise<void> {
    // Check if already cached
    let state = this.cache.get(manifest.id);

    if (state) {
      // Reactivate existing iframe
      state.active = true;
      state.lastAccessed = Date.now();
      this.showIframe(state.element);
    } else {
      // Create new iframe
      const element = this.createIframe(manifest);
      state = {
        appId: manifest.id,
        url: manifest.url,
        active: true,
        lastAccessed: Date.now(),
        element
      };

      this.config.container.appendChild(element);
      this.cache.set(manifest.id, state);
      this.showIframe(element);
    }

    // Hide previous active app
    if (this.activeAppId && this.activeAppId !== manifest.id) {
      const prevState = this.cache.get(this.activeAppId);
      if (prevState) {
        prevState.active = false;
        this.hideIframe(prevState.element);
        this.config.onAppDeactivate(this.activeAppId);
      }
    }

    this.activeAppId = manifest.id;
    this.config.onAppActivate(manifest.id);
  }

  unmountApp(appId: string): void {
    const state = this.cache.get(appId);
    if (state) {
      this.hideIframe(state.element);
      state.active = false;

      if (this.activeAppId === appId) {
        this.activeAppId = null;
      }

      this.config.onAppDeactivate(appId);
    }
  }

  getActiveAppId(): string | null {
    return this.activeAppId;
  }

  isAppMounted(appId: string): boolean {
    return this.cache.has(appId);
  }

  getIframe(appId: string): HTMLIFrameElement | undefined {
    return this.cache.get(appId)?.element;
  }

  private createIframe(manifest: AppManifest): HTMLIFrameElement {
    const iframe = document.createElement('iframe');
    iframe.id = `app-${manifest.id}`;
    iframe.src = manifest.url;

    // Security: Strict sandbox
    // allow-scripts: Required for app to function
    // allow-forms: Required for form submissions
    // NOT allow-same-origin: Prevents access to parent origin
    // NOT allow-top-navigation: Prevents breaking out of iframe
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms');

    // Additional security attributes
    iframe.setAttribute('allow', ''); // No special permissions by default
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('referrerpolicy', 'strict-origin');

    // Styling
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.position = 'absolute';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.visibility = 'hidden'; // Start hidden, show when ready

    // Handle load event
    iframe.addEventListener('load', () => {
      console.log(`[Shell] App loaded: ${manifest.id}`);
      // Visibility is handled by showIframe after SHELL_INIT exchange
    });

    // Handle errors
    iframe.addEventListener('error', () => {
      console.error(`[Shell] Failed to load app: ${manifest.id}`);
    });

    return iframe;
  }

  private showIframe(iframe: HTMLIFrameElement): void {
    iframe.style.visibility = 'visible';
    iframe.style.zIndex = '1';
  }

  private hideIframe(iframe: HTMLIFrameElement): void {
    iframe.style.visibility = 'hidden';
    iframe.style.zIndex = '0';
  }

  private handleEviction(appId: string, state: IframeState | undefined): void {
    if (!state) return;

    console.log(`[Shell] Evicting app from cache: ${appId}`);

    // Notify that app is being destroyed
    this.config.onAppDeactivate(appId);

    // Remove from DOM
    if (state.element.parentNode) {
      state.element.parentNode.removeChild(state.element);
    }

    // Cleanup iframe
    state.element.src = 'about:blank';
  }

  destroy(): void {
    // Cleanup all iframes
    for (const key of this.cache.keys()) {
      const state = this.cache.get(key);
      if (state?.element.parentNode) {
        state.element.parentNode.removeChild(state.element);
      }
    }
    this.cache.clear();
    this.activeAppId = null;
  }
}
