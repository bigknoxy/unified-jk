# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A modular iframe-based micro-frontend orchestration system. The shell platform hosts multiple apps in sandboxed iframes with a shared navigation, authentication, theme system, and audit logging.

**Key Technologies:**
- Shell: Lit (Web Components), TypeScript, Vite
- Backend Services: Express (TypeScript with tsx)
- SDK: Vanilla JavaScript (browser, UMD)

## Running the Project

```bash
# First-time setup
npm run install:all

# Start all services (one command)
npm start
# or
node start-all.mjs
```

**Services Started:**
- Shell: http://localhost:8888 (main app)
- SDK CDN: http://localhost:8887
- Sample App: http://localhost:8886
- Audit Service: http://localhost:8080
- Manifest Registry: http://localhost:8081

```bash
# Stop all services
Ctrl+C
```

## Individual Service Commands

**Shell (port 8888):**
```bash
cd shell
npm install
npm run dev      # Vite dev server
npm run build    # TypeScript + Vite build
npm run preview  # Preview production build
npm run lint     # ESLint
npm run test     # Vitest
```

**Audit Service (port 8080):**
```bash
cd audit-service
npm install
npm run dev      # tsx watch (development)
npm run build    # tsc compilation
npm run start    # node dist/index.js (production)
```

**Manifest Registry (port 8081):**
```bash
cd manifest-registry
npm install
npm run dev      # tsx watch
npm run build    # tsc
npm run start    # node dist
```

## High-Level Architecture

### Service Communication Flow

```
┌─────────────┐      postMessage      ┌─────────────┐
│ Sample App  │ ◄──────────────────► │ Shell       │
│ (iframe)    │   SHELL_INIT          │ (orchestrator)
└─────────────┘   AUDIT_EVENT         └──────┬──────┘
                                             │
                                             ▼
                                      ┌─────────────┐
                                      │ Audit       │
                                      │ Service     │
                                      │ (Express)   │
                                      └─────────────┘
                                             ▲
                                             │ HTTP POST /api/audit
                                        ┌────┴────┐
                                        │ Manifest│
                                        │ Registry│
                                        │ (Express)│
                                        └─────────┘
                                             ▲
                                             │ GET /api/manifests
```

### Core Architectural Patterns

**1. Iframe Sandboxing (Security-First)**
- Strict sandbox: `allow-scripts allow-forms` ONLY
- No `allow-same-origin`: Prevents access to parent origin
- Apps cannot access shell's DOM, cookies, or localStorage
- All communication via postMessage protocol

**2. postMessage Protocol**
Shell receives from SDK via `message-handler.ts`:
- `SHELL_INIT` - Request initialization (provides user, theme, session)
- `AUDIT_EVENT` - Security audit events
- `API_REQUEST` - Proxied API calls with auth tokens
- `GET_TOKEN` - Get current auth token
- `SHARED_STATE_SET` - Cross-app state persistence
- `NAVIGATE_REQUEST` - App-to-app navigation

**3. LRU Cache for Iframes**
- Max 3 open iframes (configurable via `maxIframes`)
- Implements MRU (Most Recently Used) eviction
- Hidden/shown via CSS visibility (not removed from DOM)
- Cleanup on eviction removes from DOM and sets src to `about:blank`

**4. Demo Auth Provider**
- Configured in `main.ts`: `authProvider: 'demo'`
- `login()` dispatches `shell:show-demo-login` event
- Shell shows modal with 4 demo users (Alice, Bob, Carol, Dave)
- `setDemoUser()` creates mock session with 24h expiry
- Real OIDC/SAML providers also supported

**5. Permission-Based Navigation**
- Apps declare required permissions in manifest
- `hasAnyPermission()` uses OR logic (any permission grants access)
- Navigation filtered in `shell-navigation.ts` based on user permissions

**6. Audit Service (Async Queue)**
- In-memory queue with batching (10 events per batch)
- 5-second flush interval
- Exponential backoff retry (max 3 retries)
- Events dropped after max retries (logged to console)

## Key Files and Responsibilities

**Shell Components (`shell/src/components/`):**
- `shell-container.ts` - Main orchestrator, initializes services, handles events
- `shell-header.ts` - User menu, login/logout, branding
- `shell-navigation.ts` - Sidebar nav, permission filtering

**Shell Services (`shell/src/services/`):**
- `iframe-manager.ts` - LRU cache, iframe lifecycle, sandbox attributes
- `message-handler.ts` - postMessage routing, ACK/NACK, origin validation
- `auth.ts` - Demo + OIDC auth, token refresh, session persistence
- `audit.ts` - Async event queue, batching, retry logic

**Backend Services:**
- `audit-service/src/routes/audit.ts` - POST /api/audit, JSONL storage
- `manifest-registry/src/store.ts` - In-memory manifest storage (resets on restart)

**SDK (`sdk/shell-client.js`):**
- UMD module, no build step required
- Auto-detects shell vs standalone mode
- Validates origins on incoming messages
- Retry logic for message delivery

## Development Patterns

**Adding a New App:**
1. Add manifest to `manifest-registry/src/store.ts`:
```typescript
{
  id: 'my-app',
  name: 'My App',
  url: 'http://localhost:PORT',
  permissions: ['app:read'],
  version: '1.0.0'
}
```
2. Start the app server on its port
3. Shell auto-discovers via `/api/manifests`

**SDK Development:**
- Edit `sdk/shell-client.js` directly (no build)
- Served via `python3 -m http.server 8887`
- Sample app includes: `<script src="http://localhost:8887/shell-client.js">`

**Security Considerations:**
- Always validate origins in postMessage handlers
- Use `textContent` instead of `innerHTML` when displaying user data
- Theme values are validated before applying to CSS
- Auth tokens stored in sessionStorage (cleared on logout)

## Troubleshooting

**"Services not initialized" error:**
- IframeManager initializes in `firstUpdated()` after DOM ready
- Ensure `shell-container` is mounted before calling mountApp

**SDK "ShellClient is not defined":**
- Check SDK CDN is running on port 8887
- Verify script tag URL: `http://localhost:8887/shell-client.js`

**Audit events not logging:**
- Check Audit Service is running on port 8080
- Verify proxy config in `vite.config.ts` for `/api/audit`
- Check browser Network tab for POST to `/api/audit`

**Manifests not loading:**
- Verify Manifest Registry on port 8081
- Check `fetchApps()` in `main.ts` extracts `data.manifests`
- Ensure CORS allows requests from shell origin

## Port Configuration

| Service | Port | URL Pattern |
|---------|------|-------------|
| Shell | 8888 | http://localhost:8888 |
| SDK CDN | 8887 | http://localhost:8887/shell-client.js |
| Sample App | 8886 | http://localhost:8886 |
| Audit Service | 8080 | http://localhost:8080/api/audit |
| Manifest Registry | 8081 | http://localhost:8081/api/manifests |

All ports are configured in `start-all.mjs` and `vite.config.ts` (proxy settings).
