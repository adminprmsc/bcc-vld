import Constants from 'expo-constants';

interface ExtraConfig {
  environment?: string;
  api?: Record<string, string>;
  apiUrl?: string;
  syncQueueKey?: string;
}

// Use Constants.expoConfig which is the modern way to access the manifest.
const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

// Get API_URL from a few sources, in order of preference:
// 1. Environment variable (EXPO_PUBLIC_API_URL)
// 2. The 'api' map in app.json, based on the current 'environment'
// 3. A fallback 'apiUrl' in app.json
// 4. A hardcoded default for local development
const environment = extra.environment ?? 'production';
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  extra.api?.[environment] ??
  extra.apiUrl ??
  'http://localhost:4000';

// Create a unique key for the sync queue based on the environment
const baseQueueKey = extra.syncQueueKey ?? 'prmsc-sync-queue';
export const SYNC_QUEUE_KEY = `${baseQueueKey}-${environment}`;
