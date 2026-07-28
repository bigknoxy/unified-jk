/**
 * User Manager - Standalone micro-app for managing demo users and roles
 */

const ROLE_PERMISSIONS = {
  admin: ['app:read', 'app:write', 'admin:read', 'admin:write', 'admin:manage', 'documents:read', 'documents:write', 'audit:read'],
  user: ['app:read', 'documents:read', 'documents:write'],
  viewer: ['documents:read'],
  developer: ['app:read', 'app:write', 'analytics:read']
};

const ROLE_COLORS = {
  admin: '#f59e0b',
  user: '#3b82f6',
  viewer: '#6b7280',
  developer: '#10b981'
};

const DEFAULT_USERS = [
  {
    id: 'alice-admin',
    email: 'alice@example.com',
    name: 'Alice (Admin)',
    permissions: ['app:read', 'app:write', 'admin:read', 'admin:write', 'admin:manage', 'documents:read', 'documents:write', 'audit:read'],
    roles: ['admin']
  },
  {
    id: 'bob-user',
    email: 'bob@example.com',
    name: 'Bob (Standard User)',
    permissions: ['app:read', 'documents:read', 'documents:write'],
    roles: ['user']
  },
  {
    id: 'carol-viewer',
    email: 'carol@example.com',
    name: 'Carol (Viewer)',
    permissions: ['documents:read'],
    roles: ['viewer']
  },
  {
    id: 'dave-developer',
    email: 'dave@example.com',
    name: 'Dave (Developer)',
    permissions: ['app:read', 'app:write', 'analytics:read'],
    roles: ['developer']
  }
];

let users = [];

function getElement(id) {
  return document.getElementById(id);
}

function loadUsers() {
  const sourceUsers = Array.isArray(window.DEMO_USERS) && window.DEMO_USERS.length > 0
    ? window.DEMO_USERS
    : DEFAULT_USERS;
  users = JSON.parse(JSON.stringify(sourceUsers));
  renderUsers();
  updateStats();
}

function renderUsers() {
  const tbody = getElement('user-table-body');
  const empty = getElement('empty-state');
  tbody.innerHTML = '';

  if (users.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  users.forEach((user) => {
    const row = document.createElement('tr');
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const role = user.roles[0] || 'user';
    const color = ROLE_COLORS[role] ?? '#6b7280';

    row.innerHTML = `
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="user-avatar" style="background:${color}">${initials}</div>
          <div>
            <div style="font-weight:600;">${user.name}</div>
            <div style="font-size:12px;color:#6b7280;">${user.email}</div>
            <div style="font-size:11px;color:#9ca3af;font-family:'IBM Plex Mono',monospace;">${user.id}</div>
          </div>
        </div>
      </td>
      <td>
        ${user.roles.map(r => `<span class="role-badge role-${r}">${r}</span>`).join('')}
      </td>
      <td>
        ${user.permissions.map(p => `<span class="perm-tag">${p}</span>`).join('')}
      </td>
      <td>
        <button class="btn" onclick="openEditModal('${user.id}')">Edit</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function updateStats() {
  getElement('stat-total').textContent = String(users.length);
  getElement('stat-admins').textContent = String(users.filter(u => u.roles.includes('admin')).length);
  const allPerms = new Set(users.flatMap(u => u.permissions));
  getElement('stat-active').textContent = String(allPerms.size);
}

function openCreateModal() {
  getElement('modal-title').textContent = 'Add User';
  getElement('edit-user-id').value = '';
  getElement('edit-user-name').value = '';
  getElement('edit-user-email').value = '';
  getElement('edit-user-role').value = 'user';
  getElement('edit-user-permissions').value = '';
  getElement('user-modal').classList.remove('hidden');
}

function openEditModal(id) {
  const user = users.find(u => u.id === id);
  if (!user) return;
  getElement('modal-title').textContent = `Edit: ${user.name}`;
  getElement('edit-user-id').value = user.id;
  getElement('edit-user-name').value = user.name;
  getElement('edit-user-email').value = user.email;
  getElement('edit-user-role').value = user.roles[0] || 'user';
  const rolePerms = ROLE_PERMISSIONS[user.roles[0]] || [];
  const extraPerms = user.permissions.filter(p => !rolePerms.includes(p));
  getElement('edit-user-permissions').value = extraPerms.join(', ');
  getElement('user-modal').classList.remove('hidden');
}

function closeModal() {
  getElement('user-modal').classList.add('hidden');
}

function saveUser() {
  const id = getElement('edit-user-id').value;
  const name = getElement('edit-user-name').value.trim();
  const email = getElement('edit-user-email').value.trim();
  const role = getElement('edit-user-role').value;
  const extraPerms = getElement('edit-user-permissions').value.split(',').map(p => p.trim()).filter(Boolean);

  if (!name || !email) {
    alert('Name and email are required');
    return;
  }

  const basePerms = ROLE_PERMISSIONS[role] || [];
  const permissions = [...new Set([...basePerms, ...extraPerms])];

  if (id) {
    const user = users.find(u => u.id === id);
    if (user) {
      user.name = name;
      user.email = email;
      user.roles = [role];
      user.permissions = permissions;
    }
  } else {
    const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    users.push({ id: newId, email, name, permissions, roles: [role] });
  }

  closeModal();
  renderUsers();
  updateStats();
}

async function init() {
  try {
    await ShellClient.init({
      appId: 'user-manager',
      shellOrigin: 'http://localhost:8888'
    });
  } catch (err) {
    console.error('Shell init failed, running standalone:', err);
  }
  loadUsers();
}

window.openCreateModal = openCreateModal;
window.openEditModal = openEditModal;
window.closeModal = closeModal;
window.saveUser = saveUser;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}
