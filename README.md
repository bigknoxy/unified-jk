# Modular App Shell Platform

An iframe-based micro-frontend orchestration system for highly regulated enterprise environments. Innovation teams set up infrastructure once, citizen developers build apps that "just plug in" to a unified experience.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           SHELL PLATFORM                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Header | User Menu | Dynamic Navigation (from manifests)        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────┬───────────────────────────────────────────────────┐  │
│  │              │                                                    │  │
│  │  Sidebar     │     Active App (iframe with strict sandbox)       │  │
│  │  Navigation  │                                                    │  │
│  │              │     ┌──────────────────────────────────────────┐  │  │
│  │              │     │ Sample App (using ShellClient SDK)       │  │  │
│  │              │     │ - User info from shell                   │  │  │
│  │              │     │ - Audit logging                          │  │  │
│  │              │     │ - Shared state                           │  │  │
│  │              │     │ - Theme applied via CSS variables        │  │  │
│  │              │     └──────────────────────────────────────────┘  │  │
│  │              │                                                    │  │
│  └──────────────┴───────────────────────────────────────────────────┘  │
│                          LRU Cache: max 3 iframes                       │
└─────────────────────────────────────────────────────────────────────────┘
                              │
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
    ┌──────────┐       ┌──────────┐       ┌──────────┐
    │ Auth     │       │ Audit    │       │ Manifest │
    │ Service  │       │ Service  │       │ Registry │
    │ (Hybrid) │       │ (Async)  │       │ (REST)   │
    └──────────┘       └──────────┘       └──────────┘
```

## Project Structure

```
shell-platform/
├── sdk/                           # ShellClient SDK (citizen developers)
│   ├── shell-client.js           # Main SDK source
│   └── dist/                     # CDN distribution
│
├── shell/                         # Shell Application (iframe orchestrator)
│   ├── src/
│   │   ├── components/           # Lit components (header, nav, container)
│   │   ├── services/             # Auth, Audit, MessageHandler, IframeManager
│   │   ├── utils/                # LRU cache implementation
│   │   ├── types/                # TypeScript definitions
│   │   └── main.ts               # Entry point
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
│
├── sample-app/                    # Demo app for citizen developers
│   └── public/
│       ├── index.html            # App HTML with SDK CDN
│       └── app.js                # Uses ShellClient API
│
└── README.md                      # This file
```

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3 (for simple HTTP servers)

### Option 1: One Command (Recommended)

Start all services with a single command:

```bash
cd ~/projects/shell-platform
npm run install:all  # First time only
npm start            # Start all services
```

This starts:
- **Shell** on http://localhost:8888
- **SDK CDN** on http://localhost:8887
- **Sample App** on http://localhost:8886
- **Audit Service** on http://localhost:8080
- **Manifest Registry** on http://localhost:8081

Press `Ctrl+C` to stop all services.

### Option 2: Individual Services

Start each service separately:

```bash
# Terminal 1: Shell (port 8888)
cd shell && npm install && npm run dev

# Terminal 2: SDK CDN (port 8887)
cd sdk && python3 -m http.server 8887

# Terminal 3: Sample App (port 8886)
cd sample-app && python3 -m http.server 8886

# Terminal 4: Audit Service (port 8080)
cd audit-service && npm install && npm run dev

# Terminal 5: Manifest Registry (port 8081)
cd manifest-registry && npm install && npm run dev
```

## Key Features

### Security (Defense in Depth)

- **Strict iframe sandbox**: `allow-scripts allow-forms` ONLY
- **No `allow-same-origin`**: Prevents access to parent origin
- **CORS enforcement**: All messages validated against registered origins
- **OIDC auth**: Hybrid proxy/direct pattern for API calls

### Audit & Compliance

- Async in-memory queue with retry
- Batched events (10 per batch, 5s flush interval)
- Correlation IDs for request tracing
- All sensitive operations logged

### Memory Management

- LRU cache for iframe lifecycle
- Max 3 open apps (configurable)
- Automatic cleanup on eviction
- Graceful degradation for standalone mode

### Developer Experience

- Single SDK include via CDN
- TypeScript definitions included
- Graceful standalone mode for development
- Automatic theme propagation via CSS variables

## ShellClient SDK API

```javascript
// Include SDK
<script src="https://shell.company.com/sdk/v1/shell-client.js"></script>

// Initialize
await ShellClient.init({
  appId: 'my-app',
  onThemeUpdate: (theme) => { /* ... */ },
  onAuthRefresh: (user) => { /* ... */ }
});

// Get current user
const user = ShellClient.getUser();

// Send audit events
await ShellClient.audit('ACTION_NAME', {
  resource: 'resource/id',
  metadata: { /* ... */ }
});

// Persist state across app switches
await ShellClient.setState('key', value);
const value = ShellClient.getState('key');

// Request navigation
await ShellClient.navigate('/apps/other-app');
```

## postMessage Protocol

### From SDK to Shell

- `SHELL_INIT` - Request initialization
- `AUDIT_EVENT` - Security event
- `API_REQUEST` - Proxied API call
- `GET_TOKEN` - Get auth token
- `SHARED_STATE_SET` - Update shared state
- `NAVIGATE_REQUEST` - Navigate to app

### From Shell to SDK

- `SHELL_INIT` - Provide user/session/theme
- `THEME_UPDATE` - Theme changed
- `AUTH_REFRESH` - Token refreshed
- `API_RESPONSE` - API call result
- `TOKEN_RESPONSE` - Token data

All messages include ACK/NACK for reliability.

## Configuration

### Shell Config (main.ts)

```typescript
const config: ShellConfig = {
  title: 'My App Shell',
  theme: { /* CSS variables */ },
  authProvider: 'oidc',
  auditEndpoint: '/api/audit',
  maxIframes: 3,
  iframeTimeout: 30000
};
```

### App Manifest

```json
{
  "id": "my-app",
  "name": "My Application",
  "url": "https://apps.company.com/my-app",
  "permissions": ["app:read", "app:write"],
  "version": "1.0.0"
}
```

## Next Steps

### For Innovation Teams

1. Set up the shell in your environment
2. Configure OIDC with your identity provider
3. Deploy the SDK to your CDN
4. Create manifest registry endpoints
5. Set up audit service backend

### For Citizen Developers

1. Include the SDK CDN in your app
2. Call `ShellClient.init()` on load
3. Use `ShellClient.audit()` for security events
4. Use `ShellClient.setState()` for persistence
5. Submit your app manifest to the registry

## License

MIT
