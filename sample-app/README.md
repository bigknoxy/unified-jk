# Sample App - Shell Platform Demo

A demonstration application showing how citizen developers integrate with the Shell Platform using the ShellClient SDK.

## Running the Sample App

### Option 1: Inside the Shell (Recommended)

1. Start the Shell Platform:
   ```bash
   cd ~/projects/shell-platform/shell
   npm install
   npm run dev
   ```

2. Start the SDK CDN server:
   ```bash
   cd ~/projects/shell-platform/sdk
   python3 -m http.server 8887
   ```

3. Serve this sample app:
   ```bash
   cd ~/projects/shell-platform/sample-app
   python3 -m http.server 8886
   ```

4. Add the sample app to the shell's manifest registry

5. Navigate to the app in the shell

### Option 2: Standalone Development

The SDK gracefully degrades when running standalone:

```bash
cd ~/projects/shell-platform/sample-app
python3 -m http.server 8886
```

Open http://localhost:8886 to see the standalone mode notice.

## SDK Features Demonstrated

1. **User Session** - Display current user info from the shell
2. **Audit Logging** - Send security events to the audit service
3. **Shared State** - Persist data across app switches
4. **Navigation** - Request shell to navigate to other apps
5. **Theme** - Automatic theming via CSS custom properties

## Code Structure

```
sample-app/
├── public/
│   ├── index.html    # Main HTML with ShellClient CDN include
│   └── app.js        # Application logic using ShellClient API
└── README.md
```

## ShellClient API Usage

### Initialize
```javascript
await ShellClient.init({
  appId: 'sample-app',
  onThemeUpdate: (theme) => { /* ... */ },
  onAuthRefresh: (user) => { /* ... */ }
});
```

### Get User
```javascript
const user = ShellClient.getUser();
// { id, email, name, permissions, roles }
```

### Audit Events
```javascript
await ShellClient.audit('DOCUMENT_CREATED', {
  resource: 'documents/123',
  metadata: { size: '2.4MB' }
});
```

### Shared State
```javascript
// Save data that persists across app switches
await ShellClient.setState('draft', documentContent);

// Retrieve later
const draft = ShellClient.getState('draft');
```

### Navigation
```javascript
// Request shell to navigate to another app
await ShellClient.navigate('/apps/documents');
```
