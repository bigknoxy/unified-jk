/**
 * Audit Operations Center — Live polling, stats charts, workflow timeline, export
 */

const POLL_INTERVAL = 3000;
let pollTimer = null;
let lastEventCount = 0;
let isPolling = false;
let previousEvents = [];

function getElement(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element;
}

function setMessage(message, isError) {
  const loadingIndicator = getElement('loading-indicator');
  const emptyState = getElement('empty-state');
  loadingIndicator.style.display = 'none';
  emptyState.style.display = 'block';
  emptyState.innerHTML = '';
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  if (isError) {
    paragraph.style.color = '#9f1239';
    paragraph.style.fontWeight = '700';
  }
  emptyState.appendChild(paragraph);
}

let autocompleteData = { actions: [], users: [], apps: [] };
let autocompleteState = { activeField: null, highlightedIndex: -1 };

function populateAutocompleteData(events) {
  const actions = new Set();
  const users = new Set();
  const apps = new Set();
  for (const event of events) {
    if (event.action) actions.add(event.action);
    if (event.userId) users.add(event.userId);
    if (event.appId) apps.add(event.appId);
  }
  autocompleteData.actions = Array.from(actions).sort();
  autocompleteData.users = Array.from(users).sort();
  autocompleteData.apps = Array.from(apps).sort();
}

function showAutocomplete(fieldId, listId, values) {
  const list = getElement(listId);
  const input = getElement(fieldId);
  const query = input.value.toLowerCase();
  const filtered = query ? values.filter(v => v.toLowerCase().includes(query)) : values;
  if (filtered.length === 0) { list.classList.remove('active'); return; }
  list.innerHTML = '';
  filtered.forEach((value, index) => {
    const item = document.createElement('div');
    item.className = 'autocomplete-item';
    item.textContent = value;
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      input.value = value;
      list.classList.remove('active');
      autocompleteState.highlightedIndex = -1;
    });
    list.appendChild(item);
  });
  list.classList.add('active');
  autocompleteState.highlightedIndex = -1;
}

function hideAllAutocomplete() {
  document.querySelectorAll('.autocomplete-list').forEach(l => l.classList.remove('active'));
  autocompleteState.activeField = null;
  autocompleteState.highlightedIndex = -1;
}

function setupAutocomplete(fieldId, listId, getDataFn) {
  const input = getElement(fieldId);
  const list = getElement(listId);
  input.addEventListener('focus', () => {
    autocompleteState.activeField = { input, list, getDataFn };
    showAutocomplete(fieldId, listId, getDataFn());
  });
  input.addEventListener('input', () => { showAutocomplete(fieldId, listId, getDataFn()); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); hideAllAutocomplete(); loadAuditEvents(); return; }
    if (e.key === 'Escape') { hideAllAutocomplete(); input.blur(); return; }
    if (!list.classList.contains('active')) return;
    const items = list.querySelectorAll('.autocomplete-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); autocompleteState.highlightedIndex = Math.min(autocompleteState.highlightedIndex + 1, items.length - 1); updateHighlight(items); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); autocompleteState.highlightedIndex = Math.max(autocompleteState.highlightedIndex - 1, 0); updateHighlight(items); }
    else if (e.key === 'Tab' || e.key === 'Enter') {
      if (autocompleteState.highlightedIndex >= 0 && items[autocompleteState.highlightedIndex]) {
        e.preventDefault();
        input.value = items[autocompleteState.highlightedIndex].textContent;
        hideAllAutocomplete();
      }
    }
  });
}

function updateHighlight(items) {
  items.forEach((item, i) => { item.classList.toggle('highlighted', i === autocompleteState.highlightedIndex); });
}

/* ---- Stats ---- */
function updateStats(stats, events) {
  const total = stats.totalEvents || stats.eventsInFile || events.length || 0;
  const today = stats.eventsToday || 0;
  getElement('total-events').textContent = String(total);
  getElement('events-today').textContent = String(today);
  getElement('today-pct').textContent = total > 0 ? `${Math.round((today / total) * 100)}% of total` : '';
  const users = new Set(events.map(e => e.userId).filter(Boolean));
  const apps = new Set(events.map(e => e.appId).filter(Boolean));
  getElement('unique-users').textContent = String(users.size);
  getElement('unique-apps').textContent = String(apps.size);
  const errorActions = ['ERROR', 'FAILED', 'DENIED', 'REJECTED', 'UNAUTHORIZED', 'FORBIDDEN'];
  const errorCount = events.filter(e => errorActions.some(err => String(e.action || '').toUpperCase().includes(err))).length;
  const successRate = events.length > 0 ? Math.round(((events.length - errorCount) / events.length) * 100) : 0;
  getElement('success-rate').textContent = `${successRate}%`;
  getElement('error-count').textContent = String(errorCount);
}

function getEventStatus(action) {
  const a = String(action || '').toUpperCase();
  if (/ERROR|FAILED|DENIED|REJECTED|UNAUTHORIZED|FORBIDDEN/.test(a)) return { text: 'error', css: 'status-error' };
  if (/START|PENDING|INIT/.test(a)) return { text: 'pending', css: 'status-pending' };
  if (/LOGIN|LOGOUT|SESSION/.test(a)) return { text: 'info', css: 'status-info' };
  return { text: 'success', css: 'status-success' };
}

function displayAuditEvents(events, highlightIds) {
  const body = getElement('audit-table-body');
  body.innerHTML = '';
  for (const event of events) {
    const row = document.createElement('tr');
    const status = getEventStatus(event.action);
    if (highlightIds && highlightIds.has(event.id)) {
      row.classList.add('new-event');
      setTimeout(() => row.classList.remove('new-event'), 1000);
    }
    const timestampCell = document.createElement('td');
    timestampCell.className = 'timestamp';
    timestampCell.textContent = new Date(event.timestamp).toLocaleString();
    const actionCell = document.createElement('td');
    actionCell.className = 'action-cell';
    actionCell.textContent = event.action || '-';
    const appCell = document.createElement('td');
    appCell.textContent = event.appId || '-';
    const userCell = document.createElement('td');
    userCell.textContent = event.userId || '-';
    const resourceCell = document.createElement('td');
    resourceCell.className = 'resource-cell';
    resourceCell.textContent = event.resource || '-';
    const statusCell = document.createElement('td');
    const badge = document.createElement('span');
    badge.className = `status-badge ${status.css}`;
    badge.textContent = status.text;
    statusCell.appendChild(badge);
    row.appendChild(timestampCell);
    row.appendChild(actionCell);
    row.appendChild(appCell);
    row.appendChild(userCell);
    row.appendChild(resourceCell);
    row.appendChild(statusCell);
    body.appendChild(row);
  }
}

/* ---- Stats Charts ---- */
function renderBarChart(containerId, data, maxItems) {
  const container = getElement(containerId);
  container.innerHTML = '';
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems || 5);
  if (entries.length === 0) {
    container.innerHTML = '<div style="color:#6b7280;font-size:13px;padding:12px 0;">No data yet</div>';
    return;
  }
  const maxVal = Math.max(...entries.map(e => e[1]), 1);
  entries.forEach(([key, val]) => {
    const pct = Math.round((val / maxVal) * 100);
    const row = document.createElement('div');
    row.className = 'chart-row';
    row.innerHTML = `
      <span class="chart-label" title="${key}">${key.length > 16 ? key.slice(0, 16) + '…' : key}</span>
      <div class="chart-bar-track"><div class="chart-bar" style="width:${pct}%"></div></div>
      <span class="chart-value">${val}</span>
    `;
    container.appendChild(row);
  });
}

function updateCharts(stats) {
  renderBarChart('chart-users', stats.eventsByUser || {}, 5);
  renderBarChart('chart-apps', stats.eventsByApp || {}, 5);
}

/* ---- Workflow Timeline (vanilla JS) ---- */
function renderWorkflowTimeline(workflow) {
  const container = getElement('workflow-timeline-container');
  if (!workflow || workflow.spans.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';
  const APP_COLORS = {
    'sample-app': '#3b82f6', 'api-explorer': '#8b5cf6', 'dashboard': '#10b981',
    'admin-manager': '#f59e0b', 'user-manager': '#ec4899', 'default': '#6b7280'
  };
  const totalDuration = workflow.completedAt
    ? new Date(workflow.completedAt).getTime() - new Date(workflow.startedAt).getTime()
    : Date.now() - new Date(workflow.startedAt).getTime();
  const uniqueApps = new Set(workflow.spans.map(s => s.appId));
  getElement('wf-title').textContent = workflow.title;
  getElement('wf-status').textContent = workflow.status;
  getElement('wf-status').className = `status-badge status-${workflow.status}`;
  getElement('wf-spans').textContent = workflow.spans.length;
  getElement('wf-apps').textContent = uniqueApps.size;
  getElement('wf-duration').textContent = totalDuration < 1000 ? `${totalDuration}ms` : `${(totalDuration / 1000).toFixed(1)}s`;
  const rows = getElement('wf-rows');
  rows.innerHTML = '';
  workflow.spans.forEach((span, idx) => {
    const color = APP_COLORS[span.appId] || APP_COLORS.default;
    const duration = span.endTime ? span.endTime - span.startTime : 500;
    const barWidth = Math.max(10, Math.min(100, (duration / Math.max(totalDuration, 1)) * 100));
    const row = document.createElement('div');
    row.className = 'wf-row';
    row.innerHTML = `
      <span class="wf-dot" style="background:${color}"></span>
      <div class="wf-bar-track"><div class="wf-bar" style="background:${color};left:${idx * 2}%;width:${barWidth}%">${span.action}</div></div>
      <span class="wf-info"><strong>${span.action}</strong><br><small style="color:#6b7280">${span.appId}</small></span>
    `;
    rows.appendChild(row);
  });
}

/* ---- API ---- */
function buildQueryParams() {
  const actionFilter = getElement('action-filter').value.trim();
  const userFilter = getElement('user-filter').value.trim();
  const appFilter = getElement('app-filter').value.trim();
  const limit = getElement('limit').value;
  const timeRange = getElement('time-range')?.value || '24h';
  const params = new URLSearchParams();
  if (actionFilter) params.set('action', actionFilter);
  if (userFilter) params.set('userId', userFilter);
  if (appFilter) params.set('appId', appFilter);
  params.set('limit', limit);
  const now = new Date();
  let from;
  if (timeRange === '1h') from = new Date(now - 3600000);
  else if (timeRange === '24h') from = new Date(now - 86400000);
  else if (timeRange === '7d') from = new Date(now - 7 * 86400000);
  else if (timeRange === '30d') from = new Date(now - 30 * 86400000);
  if (from) params.set('from', from.toISOString());
  params.set('to', now.toISOString());
  return params;
}

async function fetchAuditData() {
  const params = buildQueryParams();
  if (window.ShellClient && ShellClient.getUser()) {
    return ShellClient.api('/api/audit', { method: 'GET', params: Object.fromEntries(params.entries()) });
  }
  const response = await fetch(`/api/audit?${params.toString()}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Audit API failed: ${response.status}`);
  return response.json();
}

async function fetchStats() {
  if (window.ShellClient && ShellClient.getUser()) {
    return ShellClient.api('/api/audit/stats', { method: 'GET' });
  }
  const response = await fetch('/api/audit/stats', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Stats API failed: ${response.status}`);
  return response.json();
}

async function loadAuditEvents(isPoll = false) {
  const loadingIndicator = getElement('loading-indicator');
  const emptyState = getElement('empty-state');
  const container = getElement('audit-container');
  const statsBar = getElement('stats-bar');
  if (!isPoll) {
    loadingIndicator.style.display = 'block';
    emptyState.style.display = 'none';
    container.style.display = 'none';
    statsBar.style.display = 'none';
  }
  try {
    const data = await fetchAuditData();
    const events = data.events || [];
    populateAutocompleteData(events);
    updateStats(data.stats || {}, events);
    updateCharts(data.stats || {});
    const newIds = new Set();
    if (isPoll && events.length > lastEventCount) {
      const oldIds = new Set(previousEvents.map(e => e.id));
      events.forEach(e => { if (!oldIds.has(e.id)) newIds.add(e.id); });
    }
    lastEventCount = events.length;
    previousEvents = events;
    if (!events.length) {
      setMessage('No audit events found for the current filter set.', false);
      return;
    }
    displayAuditEvents(events, newIds.size > 0 ? newIds : null);
    container.style.display = 'block';
    statsBar.style.display = 'flex';
    updateLiveIndicator(true);
  } catch (error) {
    if (!isPoll) {
      setMessage(`Failed to load audit events: ${(error && error.message) || String(error)}`, true);
    }
    updateLiveIndicator(false);
  } finally {
    if (!isPoll) loadingIndicator.style.display = 'none';
  }
}

function clearFilters() {
  getElement('action-filter').value = '';
  getElement('user-filter').value = '';
  getElement('app-filter').value = '';
  getElement('limit').value = '100';
  const timeRange = getElement('time-range');
  if (timeRange) timeRange.value = '24h';
  hideAllAutocomplete();
  loadAuditEvents();
}

function refreshEvents() { loadAuditEvents(); }

/* ---- Live Indicator ---- */
function updateLiveIndicator(success) {
  const dot = getElement('live-dot');
  const text = getElement('live-text');
  const updated = getElement('last-updated');
  if (!dot || !text) return;
  if (success) {
    dot.className = 'live-dot live-active';
    text.textContent = 'LIVE';
    text.style.color = '#16a34a';
    if (updated) updated.textContent = `Updated ${new Date().toLocaleTimeString()}`;
  } else {
    dot.className = 'live-dot';
    text.textContent = 'OFFLINE';
    text.style.color = '#dc2626';
  }
}

function startPolling() {
  if (isPolling) return;
  isPolling = true;
  pollTimer = setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadAuditEvents(true);
    }
  }, POLL_INTERVAL);
  updatePauseButton();
}

function stopPolling() {
  isPolling = false;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  updatePauseButton();
}

function togglePolling() {
  isPolling ? stopPolling() : startPolling();
}

function updatePauseButton() {
  const btn = getElement('pause-btn');
  if (btn) btn.textContent = isPolling ? '⏸ Pause' : '▶ Resume';
}

/* ---- Export ---- */
function exportData(format) {
  if (previousEvents.length === 0) {
    alert('Nothing to export — no events loaded.');
    return;
  }
  let content, filename, type;
  if (format === 'json') {
    content = JSON.stringify(previousEvents, null, 2);
    filename = `audit-export-${Date.now()}.json`;
    type = 'application/json';
  } else {
    const headers = ['Timestamp', 'Action', 'App', 'User', 'Resource', 'Status'];
    const rows = previousEvents.map(e => [
      e.timestamp, e.action || '', e.appId || '', e.userId || '', e.resource || '',
      getEventStatus(e.action).text
    ]);
    content = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    filename = `audit-export-${Date.now()}.csv`;
    type = 'text/csv';
  }
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---- Visibility change ---- */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isPolling) {
    loadAuditEvents(true);
  }
});

async function init() {
  try {
    await ShellClient.init({ appId: 'dashboard', shellOrigin: 'http://localhost:8888' });
    if (!ShellClient.getUser()) {
      getElement('standalone-notice').style.display = 'block';
      setMessage('Standalone mode detected. Connect through Shell to use proxied API access.', false);
      return;
    }
    setupAutocomplete('action-filter', 'action-autocomplete', () => autocompleteData.actions);
    setupAutocomplete('user-filter', 'user-autocomplete', () => autocompleteData.users);
    setupAutocomplete('app-filter', 'app-autocomplete', () => autocompleteData.apps);
    document.addEventListener('click', (e) => { if (!e.target.closest('.filter-group')) hideAllAutocomplete(); });
    await loadAuditEvents();
    startPolling();
  } catch (error) {
    getElement('standalone-notice').style.display = 'block';
    setMessage(`Initialization failed: ${(error && error.message) || String(error)}`, true);
  }
}

window.loadAuditEvents = loadAuditEvents;
window.clearFilters = clearFilters;
window.refreshEvents = refreshEvents;
window.togglePolling = togglePolling;
window.exportData = exportData;
window.renderWorkflowTimeline = renderWorkflowTimeline;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  void init();
}
