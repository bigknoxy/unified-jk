# Manifest Registry

Backend service for the Shell Platform that manages app manifests and provides dynamic navigation.

## Features

- **CRUD Operations**: Register, update, delete app manifests
- **Permission Filtering**: Return only apps user has access to
- **Validation**: Zod schema validation for manifest data
- **Health Checks**: Kubernetes-compatible endpoints

## API Endpoints

### GET /api/manifests
List all manifests (filtered by user permissions).

### GET /api/manifests/:id
Get a specific manifest by ID.

### POST /api/manifests
Register a new app:
```json
{
  "id": "my-app",
  "name": "My Application",
  "url": "https://apps.company.com/my-app",
  "permissions": ["app:read"],
  "version": "1.0.0"
}
```

### PUT /api/manifests/:id
Update an existing app.

### DELETE /api/manifests/:id
Unregister an app.

## Running Locally

```bash
cd ~/projects/shell-platform/manifest-registry
npm install
npm run dev
```

Server runs on http://localhost:8081

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8081 |
| `NODE_ENV` | Environment | development |
| `SHELL_ORIGINS` | Comma-separated allowed origins | http://localhost:8888 |
| `API_KEYS` | Comma-separated API keys | dev-key-123 |

## Manifest Schema

```typescript
{
  id: string;              // Unique identifier (a-z0-9-)
  name: string;            // Display name
  description?: string;    // Optional description
  url: string;             // App URL
  icon?: string;           // Icon name
  permissions: string[]; // Required permissions
  category?: string;       // Category for grouping
  order?: number;          // Sort order
  version: string;         // Semver (x.y.z)
}
```

## Production Considerations

- Use a database instead of in-memory store
- Add caching layer for GET requests
- Implement proper authentication (JWT)
- Add rate limiting
- Validate URLs are HTTPS only
