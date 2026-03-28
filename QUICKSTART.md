# Shell Platform - Quick Start Guide

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Shell (port 8888) - Micro-frontend orchestrator           │
│  ┌─────────────┐  ┌─────────────────────────────────────┐ │
│  │ Navigation  │  │ Active App (iframe)                 │ │
│  │ Header      │  │ ┌─────────────────────────────────┐ │ │
│  │ User Menu   │  │ │ Sample App (port 8886)         │ │ │
│  └─────────────┘  │ │ Using ShellClient SDK           │ │ │
│                   │ │ from port 8887                  │ │ │
│                   │ └─────────────────────────────────┘ │ │
│                   └─────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  Audit Service         Manifest Registry       SDK CDN
  (port 8080)          (port 8081)          (port 8887)
```

## Running All Services

### One Command (Recommended)

```bash
cd ~/projects/shell-platform

# First time: install dependencies
npm run install:all

# Start all services
npm start
```

You'll see colored output from all 5 services:
```
[SHELL   ] Shell running on http://localhost:8888
[SAMPLE  ] Serving HTTP on port 8886
[SDK     ] Serving HTTP on port 8887
[AUDIT   ] Server running on port 8080
[REGISTRY] Server running on port 8081
```

Press `Ctrl+C` to stop all services.

### Manual Startup (Alternative)

If you prefer to start services individually, see the README.md.

## Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Shell | http://localhost:8888 | Main application |
| Sample App | http://localhost:8886 | Demo app |
| SDK CDN | http://localhost:8887 | SDK distribution |
| Audit | http://localhost:8080 | Audit API |
| Registry | http://localhost:8081 | Manifest API |

## Testing the Integration

1. Open http://localhost:8888 in your browser
2. The shell loads and fetches manifests from http://localhost:8081/api/manifests
3. Click "Sample App" in the navigation
4. The sample app loads in an iframe and initializes the SDK
5. The sample app connects to the shell via postMessage

## Security Considerations

### Development Mode
- By default, the SDK allows messages from any origin in development (localhost)
- Set `config.shellOrigin` in production for strict validation

### Production Deployment

1. **Configure SDK shellOrigin:**
   ```javascript
   await ShellClient.init({
     appId: 'my-app',
     shellOrigin: 'https://shell.company.com' // Required for security
   });
   ```

2. **Set environment variables:**
   ```bash
   export NODE_ENV=production
   export SHELL_ORIGINS=https://shell.company.com
   export API_KEYS=your-secure-key-here
   ```

3. **Enable HTTPS:**
   - All apps must use HTTPS in production
   - Audit service and registry should run behind TLS

4. **Audit storage:**
   - Replace JSONL files with PostgreSQL or S3 in production
   - Set up log rotation
   - Ship to SIEM (Splunk, ELK)

## Troubleshooting

### "Services not initialized" error
The iframe manager now initializes in `firstUpdated()` after the DOM is ready. This should no longer occur.

### XSS warnings in sample app
Fixed by using DOM methods (`textContent`) instead of `innerHTML` with user data.

### postMessage wildcard warnings
Fixed by requiring `shellOrigin` configuration. The SDK will throw an error if not set in production.

### Theme injection
All theme values are now validated before being applied to CSS.

## File Structure

```
shell-platform/
├── sdk/
│   ├── shell-client.js        # SDK source with security fixes
│   └── dist/
│       └── shell-client.js    # CDN distribution
│
├── shell/                      # Shell application (port 8888)
│   ├── src/
│   │   ├── components/        # Lit components
│   │   ├── services/          # Auth, Audit, MessageHandler, IframeManager
│   │   └── utils/             # LRU cache
│   ├── package.json
│   └── vite.config.ts
│
├── sample-app/                 # Demo app (port 8886)
│   └── public/
│       ├── index.html         # Uses SDK from port 8887
│       └── app.js             # Uses DOM methods (XSS fixed)
│
├── audit-service/              # Backend (port 8080)
│   ├── src/
│   │   ├── routes/            # POST /api/audit
│   │   └── middleware/        # Auth, error handling
│   └── package.json
│
├── manifest-registry/          # Backend (port 8081)
│   ├── src/
│   │   ├── routes/            # CRUD for manifests
│   │   └── middleware/        # Auth
│   └── package.json
│
└── README.md                   # Main documentation
```

## Completed Tasks

- [x] Shell Client SDK with postMessage protocol
- [x] Shell Application with Lit components
- [x] Iframe Manager with LRU cache
- [x] Message Handler with ACK/NACK
- [x] Auth Service (hybrid proxy/direct)
- [x] Audit Service (async queue with retry)
- [x] Sample App demonstrating SDK usage
- [x] Audit Service backend (Express)
- [x] Manifest Registry backend (Express)
- [x] Security fixes (XSS, CSS injection, postMessage validation)
- [x] Port configuration (8886, 8887, 8888)
