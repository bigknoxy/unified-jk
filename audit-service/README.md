# Audit Service

Backend service for the Shell Platform that receives and stores security audit events.

## Features

- **Batch Event Ingestion**: Receive up to 100 events per request
- **JSONL Storage**: Append-only log format for audit trail integrity
- **Query API**: Filter events by action, user, app, or correlation ID
- **Health Checks**: Kubernetes-compatible /health endpoints
- **CORS Support**: Configured for shell origins

## API Endpoints

### POST /api/audit
Receive batched audit events from the shell.

```json
{
  "events": [
    {
      "id": "123-456",
      "action": "DOCUMENT_CREATED",
      "resource": "documents/123",
      "appId": "sample-app",
      "userId": "user-123",
      "sessionId": "sess-456",
      "correlationId": "corr-789",
      "metadata": { "size": "2.4MB" },
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### GET /api/audit
Query events with optional filters:
- `?action=DOCUMENT_CREATED`
- `?userId=user-123`
- `?correlationId=corr-789`
- `?limit=50`

### GET /health
Service health status and disk checks.

## Running Locally

```bash
cd ~/projects/shell-platform/audit-service
npm install
npm run dev
```

Server runs on http://localhost:8080

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8080 |
| `NODE_ENV` | Environment | development |
| `SHELL_ORIGINS` | Comma-separated allowed origins | http://localhost:8888 |
| `API_KEYS` | Comma-separated API keys | dev-key-123 |

## Production Deployment

```bash
# Set production config
export NODE_ENV=production
export SHELL_ORIGINS=https://shell.company.com
export API_KEYS=your-secret-key-1,your-secret-key-2

# Build and start
npm run build
npm start
```

## Log Files

Audit events are stored in `logs/audit.jsonl`. Each line is a JSON object:

```json
{"id":"123","action":"LOGIN","userId":"user-1","timestamp":"2024-01-15T10:30:00Z"}
{"id":"124","action":"DOCUMENT_CREATED","userId":"user-1","timestamp":"2024-01-15T10:31:00Z"}
```

For production, consider:
- Rotating logs daily
- Shipping to S3/Splunk/ELK
- Database storage (PostgreSQL with partitioning)
