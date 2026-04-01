/**
 * Auth Service - Hybrid approach: Proxy for writes, Direct for reads
 * Handles token management, refresh, and user session
 */

import type { User } from '../types';
import { DEMO_USERS } from '../types';

interface AuthConfig {
  provider: 'oidc' | 'saml' | 'custom' | 'demo';
  authority?: string;
  clientId?: string;
  redirectUri?: string;
  tokenEndpoint?: string;
  refreshBuffer: number; // seconds before expiry to refresh
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export class AuthService {
  private config: AuthConfig;
  private user: User | null = null;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  constructor(config: AuthConfig) {
    this.config = {
      ...config,
      refreshBuffer: config.refreshBuffer ?? 60 // Refresh before expiry
    };
  }

  async initialize(): Promise<User | null> {
    // Check for existing session
    const stored = sessionStorage.getItem('shell_session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        this.user = session.user;
        this.accessToken = session.accessToken;
        this.refreshToken = session.refreshToken;
        this.expiresAt = session.expiresAt;

        // Check if token needs refresh
        if (this.isTokenExpired()) {
          await this.refreshAccessToken();
        }

        return this.user;
      } catch {
        this.clearSession();
      }
    }

    return null;
  }

  async login(): Promise<void> {
    // Demo mode - show user picker
    if (this.config.provider === 'demo') {
      console.warn('[DEMO MODE] Using mock authentication');
      window.dispatchEvent(new CustomEvent('shell:show-demo-login'));
      return;
    }

    // Redirect to identity provider
    if (this.config.provider === 'oidc') {
      const state = this.generateState();
      sessionStorage.setItem('auth_state', state);

      const params = new URLSearchParams({
        client_id: this.config.clientId!,
        redirect_uri: this.config.redirectUri!,
        response_type: 'code',
        scope: 'openid profile email',
        state
      });

      window.location.href = `${this.config.authority}/authorize?${params}`;
    }
  }

  async setDemoUser(userId: string): Promise<User> {
    if (this.config.provider !== 'demo') {
      throw new Error('Demo user can only be set in demo mode');
    }

    const demoUser = DEMO_USERS.find(u => u.id === userId);
    if (!demoUser) {
      throw new Error(`Demo user not found: ${userId}`);
    }

    // Create mock tokens
    this.user = demoUser;
    this.accessToken = `demo-token-${userId}`;
    this.refreshToken = `demo-refresh-${userId}`;
    this.expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    this.saveSession();

    console.log('[DEMO MODE] Logged in as:', demoUser.name);
    return demoUser;
  }

  async switchUser(userId: string): Promise<User> {
    if (this.config.provider !== 'demo') {
      throw new Error('User switching is only available in demo mode');
    }

    const demoUser = DEMO_USERS.find(u => u.id === userId);
    if (!demoUser) {
      throw new Error(`Demo user not found: ${userId}`);
    }

    this.clearSession();
    return this.setDemoUser(userId);
  }

  getDemoUsers(): User[] {
    return DEMO_USERS;
  }

  isDemoMode(): boolean {
    return this.config.provider === 'demo';
  }

  async handleCallback(code: string, state: string): Promise<User> {
    // Verify state
    const savedState = sessionStorage.getItem('auth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter');
    }

    // Exchange code for tokens
    const response = await fetch(this.config.tokenEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.config.clientId!,
        redirect_uri: this.config.redirectUri!
      })
    });

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    const tokens: TokenResponse = await response.json();
    await this.setTokens(tokens);

    // Fetch user info
    this.user = await this.fetchUserInfo();
    this.saveSession();

    return this.user;
  }

  async getToken(): Promise<string | null> {
    if (!this.accessToken) return null;

    if (this.isTokenExpired()) {
      return this.refreshAccessToken();
    }

    return this.accessToken;
  }

  async proxyRequest(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const headers = new Headers(options.headers);
    const isInternalApi = endpoint.startsWith('/api/');
    const internalApiKey = (window as unknown as { SHELL_API_KEY?: string }).SHELL_API_KEY || 'dev-key-123';
    if (!isInternalApi) {
      headers.set('Authorization', `Bearer ${token}`);
    } else if (internalApiKey) {
      headers.set('x-api-key', internalApiKey);
    }
    if (this.user?.permissions?.length) {
      headers.set('x-user-permissions', this.user.permissions.join(','));
    }

    return fetch(endpoint, {
      ...options,
      headers
    });
  }

  getUser(): User | null {
    return this.user;
  }

  hasPermission(permission: string): boolean {
    return this.user?.permissions.includes(permission) ?? false;
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(p => this.hasPermission(p));
  }

  logout(): void {
    this.clearSession();
    // Redirect to logout endpoint or clear and reload
    window.location.reload();
  }

  private async refreshAccessToken(): Promise<string> {
    // Deduplicate concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<string> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(this.config.tokenEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.config.clientId!
      })
    });

    if (!response.ok) {
      this.clearSession();
      throw new Error('Token refresh failed');
    }

    const tokens: TokenResponse = await response.json();
    await this.setTokens(tokens);
    this.saveSession();

    return tokens.access_token;
  }

  private async setTokens(tokens: TokenResponse): Promise<void> {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token ?? null;
    this.expiresAt = Date.now() + tokens.expires_in * 1000;
  }

  private async fetchUserInfo(): Promise<User> {
    const response = await fetch(`${this.config.authority}/userinfo`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const info = await response.json();

    return {
      id: info.sub,
      email: info.email,
      name: info.name || info.preferred_username,
      permissions: info.permissions || [],
      roles: info.roles || []
    };
  }

  private isTokenExpired(): boolean {
    return Date.now() >= (this.expiresAt - this.config.refreshBuffer * 1000);
  }

  private saveSession(): void {
    sessionStorage.setItem(
      'shell_session',
      JSON.stringify({
        user: this.user,
        accessToken: this.accessToken,
        refreshToken: this.refreshToken,
        expiresAt: this.expiresAt
      })
    );
  }

  private clearSession(): void {
    this.user = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = 0;
    sessionStorage.removeItem('shell_session');
    sessionStorage.removeItem('auth_state');
  }

  private generateState(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Singleton instance
let authService: AuthService | null = null;

export function initializeAuth(config: AuthConfig): AuthService {
  authService = new AuthService(config);
  return authService;
}

export function getAuthService(): AuthService {
  if (!authService) {
    throw new Error('Auth service not initialized');
  }
  return authService;
}
