# Adding a New App to the Shell Platform

This guide explains how citizen developers can create and integrate new applications with the Shell Platform using the ShellClient SDK.

## Overview

The Shell Platform follows a micro-frontend architecture where applications run in sandboxed iframes and communicate with the shell via postMessage. To add a new app:

1. Create your application (HTML/CSS/JS)
2. Integrate the ShellClient SDK
3. Register your app in the manifest registry
4. Deploy your app to a web server
5. The shell will automatically discover and display your app

## Step-by-Step Guide

### 1. Create Your Application

Create a directory for your app and set up the basic structure:

```bash
mkdir -p my-new-app/{public,src}
```

### 2. Add the ShellClient SDK

In your app's HTML file, include the ShellClient SDK from the CDN:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My New App</title>
    
    <!-- Shell Client SDK from CDN -->
    <script src="http://localhost:8887/shell-client.js"></script>
</head>
<body>
    <div id="app">
        <!-- Your app content goes here -->
    </div>
    
    <script src="src/app.js"></script>
</body>
</html>
```

### 3. Initialize the ShellClient

In your app's JavaScript file, initialize the ShellClient:

```javascript
/**
 * My New App - Shell Platform Integration
 */

// Wait for ShellClient to be available
async function init() {
  try {
    await ShellClient.init({
      appId: 'my-new-app', // Must match your manifest ID
      shellOrigin: 'http://localhost:8888', // URL of your shell instance
      onThemeUpdate: (theme) => {
        // Handle theme updates if needed
        console.log('Theme updated:', theme);
      },
      onAuthRefresh: (user) => {
        // Handle auth refresh if needed
        console.log('User refreshed:', user);
      }
    });

    // Check if we're in shell
    const user = ShellClient.getUser();
    if (user) {
      // User is authenticated, proceed with app logic
      console.log('Welcome,', user.name);
      loadAppData();
    } else {
      // Handle standalone mode (for development)
      console.warn('Running in standalone mode');
    }
  } catch (error) {
    console.error('Initialization failed:', error);
    // Show error to user
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
```

### 4. Use ShellClient Features

The ShellClient provides several useful methods:

#### Get Current User
```javascript
const user = ShellClient.getUser();
// Returns: { id, name, email, permissions: [...] }
```

#### Send Audit Events
```javascript
await ShellClient.audit('DOCUMENT_CREATED', {
  resource: 'documents/report-2026',
  metadata: {
    docType: 'financial-report',
    department: 'accounting'
  }
});
```

#### Make Proxied API Calls
```javascript
// The shell will automatically add auth tokens to these requests
const data = await ShellClient.api('/api/reports/2026', {
  method: 'GET',
  params: { format: 'summary' }
});
```

#### Persist Shared State
```javascript
// Save data that persists across app switches
await ShellClient.setState('draft-content', draftText);

// Retrieve later
const draft = await ShellClient.getState('draft-content');
```

#### Request Navigation
```javascript
// Navigate to another app in the shell
await ShellClient.navigate('/apps/documents');
```

#### Listen for Events
```javascript
ShellClient.on('CUSTOM_EVENT', (payload) => {
  console.log('Received custom event:', payload);
});
```

### 5. Create Your App Manifest

Add your app to the manifest registry by editing `manifest-registry/src/store.ts`:

```typescript
const demoManifests: AppManifest[] = [
  // ... existing manifests
  
  {
    id: 'my-new-app', // Must match your appId in ShellClient.init()
    name: 'My New App',
    description': 'Brief description of what your app does',
    url: 'http://localhost:PORT/index.html', // Where your app is hosted
    icon: 'icon-name', // Optional: icon identifier
    permissions: ['app:read'], // Required permissions to access this app
    category: 'Your Category',
    order: 10, // Order in navigation menu
    version: '1.0.0'
  }
];
```

### 6. Deploy Your App

You need to serve your app on a web server. For development:

```bash
# From your app directory
python3 -m http-server PORT
```

For production, deploy to your web server of choice (NGINX, Apache, cloud hosting, etc.).

### 7. Verify Integration

1. Start all platform services: `npm start`
2. Verify your app appears in the shell navigation
3. Click on your app to load it in the iframe
4. Check the browser console for any errors
5. Test ShellClient features (audit, API calls, state persistence)

## Best Practices

### Security
- Always validate and sanitize user input
- Use `textContent` instead of `innerHTML` when displaying user data
- Respect the sandboxed iframe environment - no direct DOM access to parent
- Validate origins when receiving messages (handled automatically by ShellClient)

### Performance
- Minimize bundle size for faster loading
- Use lazy loading for non-critical resources
- Implement proper error boundaries
- Cache static assets appropriately

### User Experience
- Follow the shell's theme via CSS variables
- Provide loading states for async operations
- Handle offline/standalone gracefully
- Make your app responsive

### Audit Logging
Log important security and business events:
- Authentication attempts
- Data creation/modification/deletion
- Permission changes
- Export/download actions
- System administration actions

## Example Complete App

See the `sample-app` directory for a complete example implementation.

## Troubleshooting

### App Not Showing in Navigation
- Verify your manifest ID matches your ShellClient.init() appId
- Check that your app is running and accessible at the URL in the manifest
- Ensure the manifest registry is running and accessible
- Check browser console for manifest fetch errors

### ShellClient Initialization Fails
- Verify the shellOrigin matches your shell URL
- Ensure the shell is running and accessible
- Check for CORS or network issues in browser dev tools
- Verify appId is correctly set

### Audit Events Not Appearing
- Verify you're calling ShellClient.audit() after initialization
- Check that the audit service is running on port 8080
- Verify you're sending valid audit events (check service logs)
- Ensure your app has been authenticated by the shell

## Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Review the service logs (shell, audit-service, manifest-registry)
3. Verify network requests in browser dev tools
4. Consult the platform documentation in CLAUDE.md
5. Ask your platform administrator for assistance

---
*Last updated: March 30, 2026*