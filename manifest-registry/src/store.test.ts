import assert from 'node:assert/strict';
import test from 'node:test';
import { ManifestStore } from './store.js';

test('workflow 1: empty permissions do not expose manifests', () => {
  const manifests = ManifestStore.getAll([], false);
  assert.equal(manifests.length, 0);
});

test('workflow 2: app:read users only get app-readable manifests', () => {
  const manifests = ManifestStore.getAll(['app:read'], false);
  const ids = manifests.map((m) => m.id);

  assert.ok(ids.includes('sample-app'));
  assert.ok(ids.includes('api-explorer'));
  assert.ok(!ids.includes('admin-manager'));
  assert.ok(!ids.includes('user-manager'));
});

test('workflow 3: admin:manage users get admin app manifests', () => {
  const manifests = ManifestStore.getAll(['admin:manage'], false);
  const ids = manifests.map((m) => m.id);

  assert.ok(ids.includes('admin-manager'));
  assert.ok(ids.includes('user-manager'));
});
