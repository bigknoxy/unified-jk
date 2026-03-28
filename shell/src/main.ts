/**
 * Shell Application Entry Point
 * Bootstraps the shell platform
 */

import type { ShellConfig, AppManifest } from './types';
import './components/shell-container';

// Default configuration
const defaultConfig: ShellConfig = {
  title: 'App Shell',
  theme: {
    primary: '#0066cc',
    textPrimary: '#1a1a1a',
    bgPrimary: '#ffffff',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '8px',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    borderRadius: '6px'
  },
  authProvider: 'oidc',
  auditEndpoint: '/api/audit',
  apiBaseUrl: '/api',
  maxIframes: 3,
  iframeTimeout: 30000
};

// Fetch apps from manifest registry
async function fetchApps(): Promise<AppManifest[]> {
  try {
    const response = await fetch('/api/manifests');
    if (!response.ok) throw new Error('Failed to fetch manifests');
    return await response.json();
  } catch (error) {
    console.error('[Shell] Failed to load app manifests:', error);
    // Return empty array or demo apps for development
    return getDemoApps();
  }
}

// Demo apps for development
function getDemoApps(): AppManifest[] {
  return [
    {
      id: 'dashboard',
      name: 'Dashboard',
      description: 'Overview and analytics',
      url: '/apps/dashboard/index.html',
      icon: 'chart',
      permissions: ['app:read'],
      category: 'Core',
      order: 1,
      version: '1.0.0'
    },
    {
      id: 'documents',
      name: 'Documents',
      description: 'Document management',
      url: '/apps/documents/index.html',
      icon: 'file',
      permissions: ['documents:read'],
      category: 'Core',
      order: 2,
      version: '1.0.0'
    },
    {
      id: 'settings',
      name: 'Settings',
      description: 'System settings',
      url: '/apps/settings/index.html',
      icon: 'settings',
      permissions: ['admin:read'],
      category: 'Admin',
      order: 3,
      version: '1.0.0'
    }
  ];
}

// Initialize shell
async function bootstrap(): Promise<void> {
  console.log('[Shell] Bootstrapping...');

  // Load configuration (could be from API or env)
  const config: ShellConfig = {
    ...defaultConfig,
    // Merge with runtime config if available
    ...(window as unknown as { SHELL_CONFIG?: ShellConfig }).SHELL_CONFIG
  };

  // Fetch app manifests
  const apps = await fetchApps();

  // Create and mount shell container
  const container = document.createElement('shell-container');
  container.config = config;
  container.apps = apps;
  container.title = config.title;
  container.logo = config.logo;

  // Mount to DOM
  const app = document.getElementById('app') || document.body;
  app.innerHTML = '';
  app.appendChild(container);

  console.log('[Shell] Bootstrap complete');
}

// Handle OAuth callback
async function handleAuthCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (code && state) {
    // Handle the callback
    try {
      const { AuthService } = await import('./services/auth');
      const authService = new AuthService({
        provider: 'oidc',
        refreshBuffer: 60
      });
      await authService.handleCallback(code, state);

      // Clean up URL
      url.searchParams.delete('code');
      url.searchParams.delete('state');
      window.history.replaceState({}, '', url.toString());

      return true;
    } catch (error) {
      console.error('[Shell] Auth callback failed:', error);
      return false;
    }
  }

  return false;
}

// Main entry
async function main(): Promise<void> {
  // Handle auth callback if present
  const isCallback = await handleAuthCallback();

  if (isCallback) {
    // Reload after successful auth to initialize fresh
    window.location.reload();
    return;
  }

  // Bootstrap the shell
  await bootstrap();
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  void main();
}

// Export for external use
export { bootstrap, fetchApps };
export * from './types';
