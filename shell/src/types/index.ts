/**
 * Shell Platform Type Definitions
 */

// App Manifest from Registry
export interface AppManifest {
  id: string;
  name: string;
  description?: string;
  url: string;
  icon?: string;
  permissions: string[];
  category?: string;
  order?: number;
  version: string;
}

// User Session
export interface User {
  id: string;
  email: string;
  name: string;
  permissions: string[];
  roles: string[];
}

// Theme Configuration
export interface Theme {
  primary: string;
  textPrimary: string;
  bgPrimary: string;
  fontFamily: string;
  spacingUnit: string;
  // Extended theme properties
  secondary?: string;
  success?: string;
  warning?: string;
  error?: string;
  borderRadius?: string;
}

// Audit Event
export interface AuditEvent {
  id: string;
  action: string;
  resource?: string;
  appId: string;
  userId: string;
  sessionId: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

// postMessage Protocol Types
export interface ShellMessage {
  type: string;
  id: string;
  timestamp: string;
  correlationId: string;
  payload?: unknown;
}

export interface ShellInitPayload {
  user: User;
  sessionId: string;
  theme: Theme;
  permissions: string[];
}

export interface APIRequestPayload {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  params?: Record<string, string>;
}

export interface NavigationPayload {
  path: string;
  preserveState?: boolean;
}

// Iframe State
export interface IframeState {
  appId: string;
  url: string;
  active: boolean;
  lastAccessed: number;
  element: HTMLIFrameElement;
}

// Navigation Item
export interface NavItem {
  id: string;
  label: string;
  icon?: string;
  appId: string;
  href?: string;
  children?: NavItem[];
}

// Demo Users for Development
export const DEMO_USERS: User[] = [
  {
    id: 'alice-admin',
    email: 'alice@example.com',
    name: 'Alice (Admin)',
    permissions: ['app:read', 'app:write', 'admin:read', 'admin:write', 'documents:read', 'documents:write', 'audit:read'],
    roles: ['admin']
  },
  {
    id: 'bob-user',
    email: 'bob@example.com',
    name: 'Bob (Standard User)',
    permissions: ['app:read', 'documents:read', 'documents:write'],
    roles: ['user']
  },
  {
    id: 'carol-viewer',
    email: 'carol@example.com',
    name: 'Carol (Viewer)',
    permissions: ['documents:read'],  // No app:read - should see no apps
    roles: ['viewer']
  },
  {
    id: 'dave-developer',
    email: 'dave@example.com',
    name: 'Dave (Developer)',
    permissions: ['app:read', 'app:write', 'analytics:read'],
    roles: ['developer']
  }
];

// Shell Configuration
export interface ShellConfig {
  title: string;
  logo?: string;
  theme: Theme;
  authProvider: 'oidc' | 'saml' | 'custom' | 'demo';
  auditEndpoint: string;
  apiBaseUrl: string;
  maxIframes: number;
  iframeTimeout: number;
}
