/**
 * Production environment configuration
 * This file replaces environment.ts during production builds.
 * Server: 203.175.74.168
 * Frontend: Port 8080 | Backend: Port 8083
 */
export const environment = {
  production: true,
  
  // API Configuration - Using nginx reverse proxy
  apiBaseUrl: '/api', // Nginx proxies /api to backend:8083
  uploadsBaseUrl: '/api/uploads',
  
  // Direct API URL (if needed for WebSocket or direct calls)
  directApiUrl: 'http://203.175.74.168:8083',
  
  // Map configuration
  defaultMapCenter: { lat: 31.5204, lng: 74.3587 }, // Lahore, Punjab
  defaultMapZoom: 7,
  
  // Feature flags
  enableOfflineMode: false,
  enableDebugLogging: false,
  
  // App info
  appVersion: '1.0.0',
  serverHost: '203.175.74.168',
  frontendPort: 8080,
  backendPort: 8083,
};
