/**
 * Manifest Store
 * In-memory storage for app manifests
 * Production should use a database
 */

import type { AppManifest } from './types.js';

// In-memory store (reset on restart)
const manifests = new Map<string, AppManifest>();

// Seed with demo data
const demoManifests: AppManifest[] = [
    {
      id: 'sample-app',
      name: 'Sample App',
      description: 'Demo application showing SDK integration',
      url: 'http://localhost:8886/index.html',
      icon: 'grid',
      permissions: ['app:read'],
      category: 'Demo',
      order: 1,
      version: '1.0.0',
      enabled: true,
      settings: {
        owner: 'citizen-dev',
        supportEmail: 'support@example.com',
      },
    },
    {
      id: 'api-explorer',
      name: 'API Explorer',
      description: 'Developer tools for API exploration',
      url: 'http://localhost:8886/api-explorer.html',
      icon: 'code',
      permissions: ['app:read', 'app:write'],
      category: 'Developer',
      order: 2,
      version: '0.1.0',
      enabled: true,
      settings: {
        owner: 'platform-team',
        docs: '/docs/api-explorer',
      },
    },
    {
      id: 'dashboard',
      name: 'Audit Dashboard',
      description: 'Real-time audit logging dashboard for compliance monitoring',
      url: 'http://localhost:8889/index.html',
      icon: 'chart',
      permissions: ['audit:read'],
      category: 'Compliance',
      order: 3,
      version: '1.0.0',
      enabled: true,
      settings: {
        owner: 'audit-team',
        refreshSeconds: 15,
      },
    },
    {
      id: 'admin-manager',
      name: 'App Manager',
      description: 'Manage registered applications, configure metadata, and control availability',
      url: 'http://localhost:8890/index.html',
      icon: 'settings',
      permissions: ['admin:manage'],
      category: 'Administration',
      order: 4,
      version: '1.0.0',
      enabled: true,
      settings: {
        owner: 'platform-team',
      },
    },
    {
      id: 'user-manager',
      name: 'User Manager',
      description: 'Manage users, roles, and permissions across the platform',
      url: 'http://localhost:8891/index.html',
      icon: 'users',
      permissions: ['admin:manage'],
      category: 'Administration',
      order: 5,
      version: '1.0.0',
      enabled: true,
      settings: {
        owner: 'platform-team',
      },
    },
  ];

// Initialize store
demoManifests.forEach(m => manifests.set(m.id, m));

export class ManifestStore {
  /**
   * Get all manifests, optionally filtered by user permissions
   */
  static getAll(userPermissions?: string[], includeDisabled = false): AppManifest[] {
    const all = Array.from(manifests.values())
      .filter(m => includeDisabled || m.enabled !== false);

    if (!userPermissions) return all;
    if (userPermissions.length === 0) return [];

    return all.filter(m => m.permissions.some(p => userPermissions.includes(p)));
  }

  /**
   * Get a specific manifest by ID
   */
  static getById(id: string): AppManifest | undefined {
    return manifests.get(id);
  }

  /**
   * Create or update a manifest
   */
  static set(manifest: AppManifest): AppManifest {
    manifests.set(manifest.id, manifest);
    return manifest;
  }

  /**
   * Partially update an existing manifest
   */
  static patch(id: string, updates: Partial<AppManifest>): AppManifest | undefined {
    const current = manifests.get(id);
    if (!current) return undefined;

    const next: AppManifest = {
      ...current,
      ...updates,
      id: current.id
    };

    manifests.set(id, next);
    return next;
  }

  /**
   * Delete a manifest
   */
  static delete(id: string): boolean {
    return manifests.delete(id);
  }

  /**
   * Get total count
   */
  static get count(): number {
    return manifests.size;
  }
}
