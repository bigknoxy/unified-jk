/**
 * Manifest Routes
 * CRUD operations for app manifests
 */

import { Router, Request, Response } from 'express';
import { AppManifestSchema, type AppManifest, type RegistryResponse } from '../types.js';
import { ManifestStore } from '../store.js';

const router = Router();

// GET /api/manifests - List all manifests
router.get('/', (req: Request, res: Response) => {
  // In production, get user permissions from auth token/header
  const permissionHeader = req.headers['x-user-permissions']?.toString();
  const userPermissions = permissionHeader
    ? permissionHeader.split(',').map((p) => p.trim()).filter(Boolean)
    : ['app:read'];
  const includeDisabled = req.query.includeDisabled === 'true';

  const manifests = ManifestStore.getAll(userPermissions, includeDisabled);

  // Sort by order field, then name
  const sorted = manifests.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });

  const response: RegistryResponse = {
    manifests: sorted,
    total: sorted.length
  };

  res.json(response);
});

const AppManifestPatchSchema = AppManifestSchema.partial().omit({ id: true });

// GET /api/manifests/:id - Get specific manifest
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const permissionHeader = req.headers['x-user-permissions']?.toString();
  const userPermissions = permissionHeader
    ? permissionHeader.split(',').map((p) => p.trim()).filter(Boolean)
    : ['app:read'];
  const includeDisabled = req.query.includeDisabled === 'true';
  const hasAdminRead = userPermissions.includes('admin:read') || userPermissions.includes('admin:write');

  const manifest = ManifestStore.getById(id);

  if (!manifest) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  const hasPermission = manifest.permissions.some((permission) => userPermissions.includes(permission));
  if (!hasPermission) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  if (manifest.enabled === false && !(includeDisabled && hasAdminRead)) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  res.json(manifest);
});

// POST /api/manifests - Register new app
router.post('/', (req: Request, res: Response) => {
  const result = AppManifestSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid manifest data',
      details: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const manifest: AppManifest = result.data;

  // Check if ID already exists
  if (ManifestStore.getById(manifest.id)) {
    return res.status(409).json({
      error: 'Conflict',
      message: `Manifest with id '${manifest.id}' already exists`
    });
  }

  // Validate URL is HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const url = new URL(manifest.url);
    if (url.protocol !== 'https:') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Production URLs must use HTTPS'
      });
    }
  }

  ManifestStore.set(manifest);

  console.log(`[ManifestRegistry] Registered app: ${manifest.id}`);

  res.status(201).json(manifest);
});

// PUT /api/manifests/:id - Update manifest
router.put('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!ManifestStore.getById(id)) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  const result = AppManifestSchema.safeParse({ ...req.body, id });

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid manifest data',
      details: result.error.errors
    });
  }

  const manifest = result.data;
  ManifestStore.set(manifest);

  console.log(`[ManifestRegistry] Updated app: ${manifest.id}`);

  res.json(manifest);
});

// PATCH /api/manifests/:id - Partially update manifest
router.patch('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!ManifestStore.getById(id)) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  const result = AppManifestPatchSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid manifest patch data',
      details: result.error.errors.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  const updated = ManifestStore.patch(id, result.data);

  if (!updated) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  console.log(`[ManifestRegistry] Patched app: ${updated.id}`);
  res.json(updated);
});

// DELETE /api/manifests/:id - Unregister app
router.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  if (!ManifestStore.getById(id)) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Manifest with id '${id}' not found`
    });
  }

  ManifestStore.delete(id);

  console.log(`[ManifestRegistry] Unregistered app: ${id}`);

  res.status(204).send();
});

export { router as manifestsRouter };
