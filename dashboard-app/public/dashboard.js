/**
 * Audit Dashboard - Shell Platform
 * Real-time audit logging dashboard for compliance monitoring
 */

// Wait for ShellClient to be available
async function init() {
  console.log('[AuditDashboard] Starting initialization...');
  const standaloneNotice = document.getElementById('standalone-notice');
  const loadingIndicator = document.getElementById('loading-indicator');
  const emptyState = document.getElementById('empty-state');
  const auditContainer = document.getElementById('audit-container');
  const statsBar = document.getElementById('stats-bar');

  // Initialize ShellClient
  try {
    console.log('[AuditDashboard] Calling ShellClient.init with shellOrigin:', 'http://localhost:8888');
    await ShellClient.init({
      appId: 'dashboard',
      shellOrigin: 'http://localhost:8888',
      onThemeUpdate: (theme) => {
        console.log('[AuditDashboard] Theme updated:', theme);
        // Theme is applied automatically via CSS variables
      },
      onAuthRefresh: (user) => {
        console.log('[AuditDashboard] Auth refreshed:', user);
        // Update user info if needed
      }
    });

    // Check if we're in shell
    const user = ShellClient.getUser();
    if (!user) {
      // Standalone mode
      standaloneNotice.style.display = 'block';
      showErrorState('Running in standalone mode. Some features may be limited.');
    } else {
      console.log('[AuditDashboard] User authenticated:', user);
      // Load initial audit events
      await loadAuditEvents();
    }
  } catch (error) {
    console.error('[AuditDashboard] Initialization failed:', error);
    standaloneNotice.style.display = 'block';
    showErrorState(`Initialization failed: ${error.message}`);
  }
}

function showErrorState(message) {
  loadingIndicator.style.display = 'none';
  emptyState.style.display = 'block';
  emptyState.innerHTML = `<p>${message}</p>`;
}

async function loadAuditEvents() {
  const loadingIndicator = document.getElementById('loading-indicator');
  const emptyState = document.getElementById('empty-state');
  const auditContainer = document.getElementById('audit-container');
  const statsBar = document.getElementById('stats-bar');
  const auditTableBody = document.getElementById('audit-table-body');

  loadingIndicator.style.display = 'block';
  emptyState.style.display = 'none';
  auditContainer.style.display = 'none';
  statsBar.style.display = 'none';

  try {
    // Get filter values
    const actionFilter = document.getElementById('action-filter').value.trim();
    const userFilter = document.getElementById('user-filter').value.trim();
    const appFilter = document.getElementById('app-filter').value.trim();
    const limit = document.getElementById('limit').value;

    // Build query parameters
    const params = {};
    if (actionFilter) params.action = actionFilter;
    if (userFilter) params.userId = userFilter;
    if (appFilter) params.appId = appFilter;
    params.limit = limit;

    // Fetch audit events using ShellClient.api (when in shell) or fetch (when in standalone)
    let data;
    if (window.ShellClient && ShellClient.getUser()) {
      // We are in the shell and initialized
      data = await ShellClient.api('/api/audit', {
        method: 'GET',
        params: params
      });
    } else {
      // Fallback to direct fetch for standalone mode (for development)
      const queryString = new URLSearchParams(params).toString();
      const response = await fetch(`/api/audit?${queryString}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      data = await response.json();
    }
    
    // Update statistics
    updateStats(data.stats || {});
    
    // Display events
    if (data.events && data.events.length > 0) {
      displayAuditEvents(data.events);
      auditContainer.style.display = 'block';
      statsBar.style.display = 'flex';
    } else {
      emptyState.style.display = 'block';
      emptyState.innerHTML = '<p>No audit events found matching the current filters.</p>';
    }
  } catch (error) {
    console.error('[AuditDashboard] Failed to load audit events:', error);
    emptyState.style.display = 'block';
    emptyState.innerHTML = `<p>Failed to load audit events: ${error.message}</p>`;
  } finally {
    loadingIndicator.style.display = 'none';
  }
}

function updateStats(stats) {
  document.getElementById('total-events').textContent = stats.totalEvents || 0;
  document.getElementById('events-today').textContent = stats.eventsToday || 0;
  
  // Calculate unique users and apps from the events if not provided in stats
  // For now, we'll just show placeholder values or calculate from events if needed
  document.getElementById('unique-users').textContent = stats.uniqueUsers || 'N/A';
  document.getElementById('unique-apps').textContent = stats.uniqueApps || 'N/A';
}

function displayAuditEvents(events) {
  const auditTableBody = document.getElementById('audit-table-body');
  
  // Clear existing rows
  auditTableBody.innerHTML = '';
  
  // Add each event as a row
  events.forEach(event => {
    const row = document.createElement('tr');
    
    // Format timestamp
    const timestamp = new Date(event.timestamp).toLocaleString();
    
    // Determine status based on action (simplified)
    let statusText = 'success';
    let statusClass = 'status-success';
    if (event.action.includes('ERROR') || event.action.includes('FAILED')) {
      statusText = 'error';
      statusClass = 'status-error';
    } else if (event.action.includes('PENDING') || event.action.includes('STARTED')) {
      statusText = 'pending';
      statusClass = 'status-pending';
    }
    
    row.innerHTML = `
      <td class="timestamp">${timestamp}</td>
      <td class="action-cell">${escapeHtml(event.action)}</td>
      <td>${escapeHtml(event.appId)}</td>
      <td>${escapeHtml(event.userId)}</td>
      <td class="resource-cell">${escapeHtml(event.resource || '-')}</td>
      <td><span class="status-badge ${statusClass}">${statusText}</span></td>
    `;
    
    auditTableBody.appendChild(row);
  });
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function clearFilters() {
  document.getElementById('action-filter').value = '';
  document.getElementById('user-filter').value = '';
  document.getElementById('app-filter').value = '';
  document.getElementById('limit').value = '100';
  loadAuditEvents();
}

function refreshEvents() {
  loadAuditEvents();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}