/**
 * Development environment configuration
 * This file is used during `ng serve` and development builds.
 */
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:3000',
  uploadsBaseUrl: 'http://localhost:3000/uploads',
  
  // Map configuration
  defaultMapCenter: { lat: 31.5204, lng: 74.3587 }, // Lahore, Punjab
  defaultMapZoom: 7,
  
  // Feature flags
  enableOfflineMode: false,
  enableDebugLogging: true,
};
