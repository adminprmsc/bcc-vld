# Android App Integration Plan

## Overview

This document outlines the integration between the React Native mobile application and the LDS backend system for field data collection and synchronization.

---

## Current Mobile App Architecture

### Technology Stack
- **React Native** 0.74.x with Expo 51.x
- **State Management**: Zustand
- **Data Fetching**: React Query (TanStack Query)
- **Offline Storage**: expo-sqlite
- **Maps**: Mapbox GL
- **Navigation**: React Navigation 6.x

### Existing Features
- User authentication (JWT)
- Dashboard with metrics
- Task list for field operations
- Map view with asset overlays
- Offline queue for sync

---

## Backend Mobile API Endpoints

### Base URL
```
Production: https://your-domain.com/api/mobile
Development: http://localhost:3000/mobile
```

### Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Available Endpoints

#### Dashboard & Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/dashboard` | Dashboard metrics snapshot |
| GET | `/mobile/tasks` | User's assigned tasks |
| POST | `/mobile/tasks/:id/complete` | Mark task complete |

#### Sync Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/sync` | Get sync status |
| POST | `/mobile/sync/:channel/retry` | Retry failed sync |

#### Map Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mobile/map-overlays` | GeoJSON features for map |

#### Form Submissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mobile/forms/requisition` | Submit new requisition |
| POST | `/mobile/forms/requisition/:id/attachments` | Upload requisition attachments |
| POST | `/mobile/forms/maintenance` | Submit maintenance record |
| POST | `/mobile/forms/water-sample-collection` | Submit sample collection |
| POST | `/mobile/forms/water-sample-collection/:id/attachments` | Upload sample photos |

---

## Form Data Schemas

### Requisition Form

```typescript
interface RequisitionForm {
  title: string;           // Required
  purpose: string;         // Required
  tehsil: string;          // Required
  district?: string;
  description?: string;
  landArea?: string;
  landType?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Critical';
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  mapMarker?: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  offlineId?: string;      // Client-side ID for sync mapping
}

// Response
interface RequisitionResponse {
  success: boolean;
  id: string;              // MongoDB ObjectId
  sequenceNumber: number;  // Human-readable ID
  offlineId?: string;      // Echo back for client mapping
}
```

### Maintenance Form

```typescript
interface MaintenanceForm {
  planId: string;          // Asset ID (required)
  type: 'preventive' | 'corrective' | 'emergency' | 'inspection';
  description: string;     // Required
  cost?: number;
  notes?: string;
  performedAt?: string;    // ISO date string
  offlineId?: string;
}

// Response
interface MaintenanceResponse {
  success: boolean;
  recordId: string;
  offlineId?: string;
}
```

### Water Sample Collection Form

```typescript
interface SampleCollectionForm {
  sampleId: string;        // Pre-assigned sample ID (required)
  collectedAt: string;     // ISO date string (required)
  fieldNotes?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  offlineId?: string;
}

// Response
interface SampleCollectionResponse {
  success: boolean;
  status: string;          // New sample status
  offlineId?: string;
}
```

---

## Offline Sync Implementation

### Sync Queue Structure

```typescript
interface SyncQueueItem {
  id: string;              // Local UUID
  type: 'requisition' | 'maintenance' | 'sample-collection';
  action: 'create' | 'update';
  payload: object;         // Form data
  attachments?: string[];  // Local file URIs
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  error?: string;
  serverId?: string;       // Set after successful sync
}
```

### Sync Logic

```typescript
// Pseudocode for sync process
async function processSyncQueue() {
  const pendingItems = await getQueueItems('pending');
  
  for (const item of pendingItems) {
    try {
      await updateItemStatus(item.id, 'syncing');
      
      // Submit form data
      const response = await submitForm(item.type, item.payload);
      
      // Upload attachments if any
      if (item.attachments?.length) {
        await uploadAttachments(item.type, response.id, item.attachments);
      }
      
      // Mark as synced
      await updateItemStatus(item.id, 'synced', { serverId: response.id });
      
    } catch (error) {
      await updateItemStatus(item.id, 'failed', { 
        error: error.message,
        attempts: item.attempts + 1 
      });
    }
  }
}
```

### Conflict Resolution

| Scenario | Resolution |
|----------|------------|
| No network | Queue locally, sync when online |
| Server error (5xx) | Retry with exponential backoff |
| Validation error (4xx) | Mark failed, show user |
| Duplicate submission | Use offlineId to dedupe |

---

## Mobile App Updates Required

### 1. Update API Service

**File**: `mobile/app/src/core/api/prmscService.ts`

```typescript
// Add form submission methods
export const mobileApi = {
  // Existing methods...
  
  submitRequisition: async (data: RequisitionForm) => {
    return httpClient.post('/mobile/forms/requisition', data);
  },
  
  uploadRequisitionAttachments: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    return httpClient.post(`/mobile/forms/requisition/${id}/attachments`, formData);
  },
  
  submitMaintenance: async (data: MaintenanceForm) => {
    return httpClient.post('/mobile/forms/maintenance', data);
  },
  
  submitSampleCollection: async (data: SampleCollectionForm) => {
    return httpClient.post('/mobile/forms/water-sample-collection', data);
  },
  
  uploadSampleAttachments: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(file => formData.append('attachments', file));
    return httpClient.post(`/mobile/forms/water-sample-collection/${id}/attachments`, formData);
  }
};
```

### 2. Add Form Screens

Create new screens in `mobile/app/src/screens/`:

- `RequisitionFormScreen.tsx` - Land requisition submission
- `MaintenanceFormScreen.tsx` - Asset maintenance records
- `SampleCollectionScreen.tsx` - Water sample field collection

### 3. Update Navigation

**File**: `mobile/app/src/navigation/AppNavigator.tsx`

```typescript
// Add new routes
<Stack.Screen name="RequisitionForm" component={RequisitionFormScreen} />
<Stack.Screen name="MaintenanceForm" component={MaintenanceFormScreen} />
<Stack.Screen name="SampleCollection" component={SampleCollectionScreen} />
```

### 4. Implement Offline Store

**File**: `mobile/app/src/core/stores/syncStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SyncStore {
  queue: SyncQueueItem[];
  addToQueue: (item: Omit<SyncQueueItem, 'id' | 'createdAt'>) => void;
  removeFromQueue: (id: string) => void;
  updateItemStatus: (id: string, status: string, data?: object) => void;
  getPendingCount: () => number;
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      queue: [],
      addToQueue: (item) => {
        const newItem = {
          ...item,
          id: uuid(),
          createdAt: new Date().toISOString(),
          status: 'pending',
          attempts: 0
        };
        set({ queue: [...get().queue, newItem] });
      },
      // ... other methods
    }),
    { name: 'sync-queue-storage' }
  )
);
```

---

## Role-Based Form Access

| Role | Requisition | Maintenance | Sample Collection |
|------|-------------|-------------|-------------------|
| Super Admin | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ |
| DM Tehsil | ✅ | ❌ | ❌ |
| Tehsil Manager | ✅ | ✅ | ❌ |
| PCRWR Sampler | ❌ | ❌ | ✅ |
| PCRWR Lab | ❌ | ❌ | ✅ (view only) |
| RA Environment | ❌ | ❌ | ✅ |
| Infra Engineer | ✅ | ✅ | ❌ |
| Others | ❌ | ❌ | ❌ |

---

## Testing Checklist

### Unit Tests
- [ ] Form validation for all form types
- [ ] Sync queue operations (add, remove, update)
- [ ] Offline/online state detection
- [ ] JWT token refresh handling

### Integration Tests
- [ ] Form submission with valid data
- [ ] Form submission with invalid data (validation errors)
- [ ] Attachment upload (single and multiple)
- [ ] Offline queue processing
- [ ] Conflict resolution scenarios

### E2E Tests
- [ ] Complete requisition workflow (create → attachments → sync)
- [ ] Complete maintenance workflow
- [ ] Complete sample collection workflow
- [ ] Network loss during submission
- [ ] App restart with pending queue items

---

## Deployment Notes

### API URL Configuration

**File**: `mobile/app/src/core/config/env.ts`

```typescript
export const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:3000',
    mobilePrefix: '/mobile'
  },
  staging: {
    baseUrl: 'https://staging-api.your-domain.com',
    mobilePrefix: '/mobile'
  },
  production: {
    baseUrl: 'https://api.your-domain.com',
    mobilePrefix: '/mobile'
  }
};
```

### Build Commands

```bash
# Development
npx expo start

# Android APK (for testing)
eas build --platform android --profile preview

# Android AAB (for Play Store)
eas build --platform android --profile production

# iOS (requires Apple Developer account)
eas build --platform ios --profile production
```

---

## Next Steps

1. **Immediate**: Install dependencies and test mobile routes
2. **Week 1**: Implement form screens with validation
3. **Week 2**: Add offline sync queue and background processing
4. **Week 3**: Integration testing and bug fixes
5. **Week 4**: Beta testing with field users
6. **Week 5**: Production release

---

## Support

For mobile app issues:
1. Check device logs: `adb logcat`
2. Review sync queue state
3. Verify API connectivity
4. Contact mobile development team
