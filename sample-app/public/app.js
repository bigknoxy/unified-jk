/**
 * Sample App - Shell Platform SDK Demo
 * Shows citizen developers how to integrate with the shell
 */

// Wait for ShellClient to be available
async function init() {
  const statusEl = document.getElementById('user-section');
  const standaloneNotice = document.getElementById('standalone-notice');

  // Initialize ShellClient
  try {
    await ShellClient.init({
      appId: 'sample-app',
      shellOrigin: 'http://localhost:8888',
      onThemeUpdate: (theme) => {
        console.log('[SampleApp] Theme updated:', theme);
        updateThemeDisplay(theme);
      },
      onAuthRefresh: (user) => {
        console.log('[SampleApp] Auth refreshed:', user);
        displayUser(user);
      }
    });

    // Check if we're in shell
    const user = ShellClient.getUser();
    if (user) {
      displayUser(user);
    } else {
      // Standalone mode
      standaloneNotice.style.display = 'block';
      statusEl.innerHTML = `
        <div class="user-info">
          <div class="avatar" style="background: #9ca3af;">?</div>
          <div class="user-details">
            <h3>Not Connected</h3>
            <p>Run this app inside the shell to see user info</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('[SampleApp] Initialization failed:', error);
    standaloneNotice.style.display = 'block';

    // SECURITY FIX: Use DOM methods instead of innerHTML
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.style.background = '#dc2626';
    avatar.textContent = '!';

    const title = document.createElement('h3');
    title.textContent = 'Connection Error';

    const msg = document.createElement('p');
    msg.textContent = error.message; // textContent escapes HTML

    const userDetails = document.createElement('div');
    userDetails.className = 'user-details';
    userDetails.appendChild(title);
    userDetails.appendChild(msg);

    const userInfo = document.createElement('div');
    userInfo.className = 'user-info';
    userInfo.appendChild(avatar);
    userInfo.appendChild(userDetails);

    statusEl.innerHTML = '';
    statusEl.appendChild(userInfo);
  }
}

function displayUser(user) {
  const statusEl = document.getElementById('user-section');
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const permissionsHtml = user.permissions
    .slice(0, 5)
    .map((p) => `<span class="tag">${p}</span>`)
    .join('');

  // SECURITY FIX: Use DOM methods instead of innerHTML to prevent XSS
  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.textContent = initials;

  const name = document.createElement('h3');
  name.textContent = user.name;

  const email = document.createElement('p');
  email.textContent = user.email;

  const permissions = document.createElement('p');
  permissions.style.marginTop = '8px';
  // Sanitize permission tags by creating elements instead of HTML
  user.permissions.slice(0, 5).forEach(p => {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = p;
    permissions.appendChild(tag);
  });

  const userDetails = document.createElement('div');
  userDetails.className = 'user-details';
  userDetails.appendChild(name);
  userDetails.appendChild(email);
  userDetails.appendChild(permissions);

  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  userInfo.appendChild(avatar);
  userInfo.appendChild(userDetails);

  statusEl.innerHTML = '';
  statusEl.appendChild(userInfo);
}

function updateThemeDisplay(theme) {
  if (theme) {
    document.getElementById('theme-primary').textContent = theme.primary;
    document.getElementById('theme-text').textContent = theme.textPrimary;
    document.getElementById('theme-bg').textContent = theme.bgPrimary;
  }
}

// Audit logging functions
async function logCreateEvent() {
  const statusEl = document.getElementById('audit-status');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Sending audit event...';

  try {
    await ShellClient.audit('DOCUMENT_CREATED', {
      resource: 'documents/sample-doc',
      metadata: {
        docType: 'report',
        size: '2.4MB'
      }
    });
    statusEl.textContent = '✅ Audit event sent: DOCUMENT_CREATED';
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
  }

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

async function logUpdateEvent() {
  const statusEl = document.getElementById('audit-status');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Sending audit event...';

  try {
    await ShellClient.audit('RECORD_UPDATED', {
      resource: 'records/12345',
      metadata: {
        fields: ['name', 'status'],
        oldStatus: 'pending',
        newStatus: 'active'
      }
    });
    statusEl.textContent = '✅ Audit event sent: RECORD_UPDATED';
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
  }

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

async function logDeleteEvent() {
  const statusEl = document.getElementById('audit-status');
  statusEl.style.display = 'block';
  statusEl.textContent = 'Sending audit event...';

  try {
    await ShellClient.audit('ITEM_DELETED', {
      resource: 'items/67890',
      metadata: {
        itemType: 'temporary',
        reason: 'cleanup'
      }
    });
    statusEl.textContent = '✅ Audit event sent: ITEM_DELETED';
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
  }

  setTimeout(() => {
    statusEl.style.display = 'none';
  }, 3000);
}

// Shared state functions
async function setSharedState() {
  const key = document.getElementById('state-key').value;
  const value = document.getElementById('state-value').value;

  if (!key || !value) {
    alert('Please enter both key and value');
    return;
  }

  const statusEl = document.getElementById('state-status');
  statusEl.style.display = 'block';

  try {
    await ShellClient.setState(key, value);
    statusEl.textContent = `✅ Saved: "${key}" = "${value}"`;
    statusEl.style.background = '#dcfce7';
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
    statusEl.style.background = '#fee2e2';
  }

  setTimeout(() => {
    statusEl.style.background = '#e6f0fa';
  }, 3000);
}

function getSharedState() {
  const key = document.getElementById('state-key').value;

  if (!key) {
    alert('Please enter a key to load');
    return;
  }

  const statusEl = document.getElementById('state-status');
  statusEl.style.display = 'block';

  try {
    const value = ShellClient.getState(key);
    if (value !== undefined) {
      statusEl.textContent = `📦 Loaded: "${key}" = "${value}"`;
      document.getElementById('state-value').value = value;
    } else {
      statusEl.textContent = `⚠️ No value found for key: "${key}"`;
    }
  } catch (error) {
    statusEl.textContent = `❌ Failed: ${error.message}`;
  }
}

// Navigation
async function navigateTo(appPath) {
  try {
    await ShellClient.navigate(`/apps/${appPath}`);
  } catch (error) {
    console.error('[SampleApp] Navigation failed:', error);
    alert('Navigation only works when running inside the shell');
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
