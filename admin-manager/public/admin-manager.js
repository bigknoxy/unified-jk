/**
 * Admin Manager - Standalone micro-app for managing app manifests
 */

const ICONS = [
  { name: 'grid', emoji: '⊞' },
  { name: 'chart', emoji: '📊' },
  { name: 'code', emoji: '💻' },
  { name: 'settings', emoji: '⚙️' },
  { name: 'shield', emoji: '🛡️' },
  { name: 'users', emoji: '👥' },
  { name: 'file', emoji: '📄' },
  { name: 'home', emoji: '🏠' },
  { name: 'search', emoji: '🔍' },
  { name: 'bell', emoji: '🔔' },
  { name: 'lock', emoji: '🔒' },
  { name: 'key', emoji: '🔑' },
  { name: 'database', emoji: '🗄️' },
  { name: 'cloud', emoji: '☁️' },
  { name: 'terminal', emoji: '⌨️' },
  { name: 'rocket', emoji: '🚀' }
];

const ICON_COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#ec4899','#06b6d4','#6366f1','#14b8a6','#f97316','#84cc16','#a855f7','#0ea5e9','#e11d48','#64748b','#d946ef'];

let apps = [];
let selectedIcon = 'grid';
let isShellConnected = false;

async function notifyManifestChange() {
  if (!isShellConnected || !window.ShellClient?.setState) return;
  try {
    await window.ShellClient.setState('manifests:version', Date.now());
  } catch (err) {
    console.warn('Failed to notify shell manifest refresh:', err);
  }
}

const STANDALONE_HEADERS = {
  'Content-Type': 'application/json',
  'x-api-key': 'dev-key-123',
  'x-user-permissions': 'admin:write,admin:read,admin:manage,app:read,app:write'
};

function getShellPermissionHeaders() {
  const user = window.ShellClient?.getUser?.();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  if (permissions.length === 0) {
    return null;
  }

  return {
    'x-api-key': 'dev-key-123',
    'x-user-permissions': permissions.join(',')
  };
}

function getElement(id) {
  return document.getElementById(id);
}

async function apiRequest(path, options = {}) {
  if (isShellConnected && window.ShellClient) {
    const headers = getShellPermissionHeaders();
    if (headers) {
      const response = await fetch(`http://localhost:8081${path}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          ...(options.headers || {})
        },
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const err = await response.json();
          message = err.error || err.message || message;
        } catch {
          // Keep HTTP status fallback.
        }
        throw new Error(message);
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    }

    return ShellClient.api(path, {
      method: options.method || 'GET',
      params: options.params,
      body: options.body,
    });
  }

  const response = await fetch(`http://localhost:8081${path}`, {
    method: options.method || 'GET',
    headers: options.headers || STANDALONE_HEADERS,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const err = await response.json();
      message = err.error || err.message || message;
    } catch {
      // Ignore JSON parse errors and keep HTTP status message.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadApps() {
  try {
    const response = await apiRequest('/api/manifests?includeDisabled=true', { method: 'GET' });
    apps = response.manifests || [];
    renderApps();
  } catch (err) {
    console.error('Failed to load apps:', err);
    getElement('empty-state').classList.remove('hidden');
  }
}

function renderApps() {
  const list = getElement('app-list');
  const empty = getElement('empty-state');
  list.innerHTML = '';

  if (apps.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  apps.forEach((app, idx) => {
    const enabled = app.enabled !== false;
    const iconIdx = ICONS.findIndex(i => i.name === app.icon);
    const icon = ICONS[iconIdx >= 0 ? iconIdx : 0];
    const color = ICON_COLORS[idx % ICON_COLORS.length];

    const card = document.createElement('div');
    card.className = 'app-card';
    card.innerHTML = `
      <div class="app-icon" style="background:${color}20;color:${color}">${icon.emoji}</div>
      <div class="app-info">
        <div class="app-name">${app.name}</div>
        <div class="app-meta">${app.id} • ${app.version} • ${app.category || 'No category'}</div>
      </div>
      <div class="app-actions">
        <span class="status-badge ${enabled ? 'status-enabled' : 'status-disabled'}">${enabled ? 'Enabled' : 'Disabled'}</span>
        <button class="toggle ${enabled ? 'enabled' : 'disabled'}" onclick="toggleApp('${app.id}', ${enabled})">${enabled ? 'Disable' : 'Enable'}</button>
        <button class="btn" onclick="openEditModal('${app.id}')">Edit</button>
      </div>
    `;
    list.appendChild(card);
  });
}

async function toggleApp(id, currentlyEnabled) {
  try {
    await apiRequest(`/api/manifests/${id}`, {
      method: 'PATCH',
      body: { enabled: !currentlyEnabled }
    });
    await loadApps();
    await notifyManifestChange();
  } catch (err) {
    console.error('Toggle failed:', err);
  }
}

function renderIconPicker(selectedName) {
  const picker = getElement('icon-picker');
  picker.innerHTML = '';
  selectedIcon = selectedName || 'grid';
  ICONS.forEach((icon, idx) => {
    const opt = document.createElement('div');
    opt.className = `icon-option ${icon.name === selectedIcon ? 'selected' : ''}`;
    opt.textContent = icon.emoji;
    opt.title = icon.name;
    opt.onclick = () => {
      picker.querySelectorAll('.icon-option').forEach(el => el.classList.remove('selected'));
      opt.classList.add('selected');
      selectedIcon = icon.name;
    };
    picker.appendChild(opt);
  });
}

function openCreateModal() {
  getElement('modal-title').textContent = 'Add New App';
  getElement('edit-app-id').value = '';
  getElement('edit-name').value = '';
  getElement('edit-url').value = '';
  getElement('edit-description').value = '';
  getElement('edit-category').value = '';
  getElement('edit-version').value = '1.0.0';
  getElement('edit-permissions').value = 'app:read';
  renderIconPicker('grid');
  getElement('edit-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const app = apps.find(a => a.id === id);
  if (!app) return;
  getElement('modal-title').textContent = `Edit: ${app.name}`;
  getElement('edit-app-id').value = app.id;
  getElement('edit-name').value = app.name;
  getElement('edit-url').value = app.url;
  getElement('edit-description').value = app.description || '';
  getElement('edit-category').value = app.category || '';
  getElement('edit-version').value = app.version;
  getElement('edit-permissions').value = (app.permissions || []).join(', ');
  renderIconPicker(app.icon);
  getElement('edit-modal').classList.remove('hidden');
}

function closeModal() {
  getElement('edit-modal').classList.add('hidden');
}

async function saveApp() {
  const id = getElement('edit-app-id').value;
  const name = getElement('edit-name').value.trim();
  const url = getElement('edit-url').value.trim();
  const description = getElement('edit-description').value.trim();
  const category = getElement('edit-category').value.trim();
  const version = getElement('edit-version').value.trim() || '1.0.0';
  const permissions = getElement('edit-permissions').value.split(',').map(p => p.trim()).filter(Boolean);

  if (!name || !url) {
    alert('Name and URL are required');
    return;
  }

  const payload = { name, url, description, category, version, icon: selectedIcon, permissions };

  try {
    if (id) {
      await apiRequest(`/api/manifests/${id}`, {
        method: 'PATCH',
        body: payload
      });
    } else {
      const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
      await apiRequest('/api/manifests', {
        method: 'POST',
        body: { ...payload, id: newId }
      });
    }

    closeModal();
    await loadApps();
    await notifyManifestChange();
  } catch (err) {
    console.error('Save failed:', err);
    alert(`Failed to save: ${err.message}`);
  }
}

async function init() {
  try {
    await ShellClient.init({
      appId: 'admin-manager',
      shellOrigin: 'http://localhost:8888'
    });
    isShellConnected = !!ShellClient.getUser();
  } catch (err) {
    console.error('Init failed:', err);
    isShellConnected = false;
  }
  await loadApps();
}

window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.saveApp = saveApp;
window.toggleApp = toggleApp;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}
