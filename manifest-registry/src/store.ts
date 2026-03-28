/**
 * Manifest Store
 * In-memory storage for app manifests
 * Production should use a database
 */

import type { AppManifest } from './types.js';

// In-memory store (reset on restart)
const manifests = new Map<string, AppManifest>();

// Seed with demo data
// NOTE: Only Sample App is actually running (port 8886)
// Other apps would need to be implemented and started on their respective ports
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
    version: '1.0.0'
  },
  {
    id: 'api-explorer',
    name: 'API Explorer',
    description: 'Developer tools for API exploration (Placeholder - not implemented)',
    url: 'http://localhost:8886/index.html?app=api-explorer',
    icon: 'code',
    permissions: ['app:read', 'app:write'],
    category: 'Developer',
    order: 2,
    version: '0.1.0'
  }
];

// Initialize store
demoManifests.forEach(m => manifests.set(m.id, m));

export class ManifestStore {
  /**
   * Get all manifests, optionally filtered by user permissions
   */
  static getAll(userPermissions?: string[]): AppManifest[] {
    const all = Array.from(manifests.values());

    if (!userPermissions) {
      return all;
    }

    // Filter manifests by permissions
    return all.filter(manifest =>
      manifest.permissions.some(p => userPermissions.includes(p))
    );
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
