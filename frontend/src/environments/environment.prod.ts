/**
 * Production environment configuration
 * Built into the Angular app at compile time.
 * API calls use relative /api paths — edge nginx proxies to the backend on the same origin.
 */
export const environment = {
  production: true,

  apiBaseUrl: '/api',
  uploadsBaseUrl: '/api/uploads',

  defaultMapCenter: { lat: 31.5204, lng: 74.3587 },
  defaultMapZoom: 7,

  enableOfflineMode: false,
  enableDebugLogging: false,

  appVersion: '1.0.0',
};
