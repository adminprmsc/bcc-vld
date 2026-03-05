# Mobile Architecture Blueprint

## Overview

The PRMSC Field Operations Mobile Suite is an offline-first companion to the existing web platform. It will run on Android and iOS, sharing a single codebase. The solution emphasises a clean separation of layers, robust synchronization, and modular role-based features.

```
+-------------------------------------------------------------+
|                      Presentation Layer                     |
|  - Role-based navigation (RA, BCC, Sampler, Lab, TM, DM)    |
|  - Map views, forms, dashboards, notifications UI           |
+------------------------------↑------------------------------+
|                      Domain / Use Case Layer                |
|  - Interactors for asset flagging, sampling, requisition    |
|  - Validation, business rules, entity mappers               |
+------------------------------↑------------------------------+
|                      Data Layer                             |
|  - Repositories (remote + local)                            |
|  - API clients (REST/GraphQL), sync queue manager           |
|  - Local persistence (SQLite/Room/Hive)                     |
+------------------------------↑------------------------------+
|                      Platform Services                      |
|  - Push notifications (FCM/APNs)                            |
|  - Secure storage (tokens, sensitive prefs)                 |
|  - Map SDK (MapLibre/Mapbox)                                |
|  - Background tasks (sync, geofencing)                      |
+-------------------------------------------------------------+
```

## Technology Choices

- **Framework:** Flutter (preferred) or React Native, enabling modular packages and platform parity.
- **State Management:** Riverpod or Bloc (Flutter) / Redux Toolkit or Recoil (React Native) for predictable state.
- **Local Database:** SQLite via `drift`/`floor` (Flutter) or WatermelonDB/Realm (React Native) with encryption.
- **Networking:** REST over HTTPS using `dio`/`http` (Flutter) or Axios/Fetch (React Native) with interceptors.
- **Sync Scheduling:** Background fetch / WorkManager to process queues when connectivity is restored.
- **Maps:** MapLibre GL with downloadable styles; additional base-map service (satellite, terrain).
- **Notifications:** Firebase Cloud Messaging (Android/iOS) and APNs, integrating with backend notification service.

## Module Breakdown

### Core Modules

- `auth` — login, token refresh, device registration, biometric unlock.
- `core/ui` — shared widgets, theming, typography, localisation.
- `core/map` — map viewer, basemap selector, offline tile manager, coordinate search.
- `core/sync` — queue manager, delta fetch, conflict resolution policies.
- `core/data` — API client, DTOs, repository implementations, secure storage wrappers.

### Role Modules

- `roles/ra` — asset explorer, critical flagging, operational snapshots, requisition initiation.
- `roles/bcc` — land requirement forms, outreach planner, requisition status editing.
- `roles/sampler` — assignments list, sampling wizard, offline queue, barcode scanner.
- `roles/lab` — sample intake, lab result forms, quality score viewer.
- `roles/tm` — asset plan creation, maintenance updates, snapshot logging.
- `roles/dm` — land activity dashboard, approvals, oversight metrics.

Each role module exports screens, controllers, and domain logic; they depend on shared `core` modules for persistence and networking.

## Sync Strategy

1. **Local Cache**
   - Entities stored in encrypted SQLite tables (assets, requisitions, samples, maintenance records, notifications).
   - Separate queue tables for outbound actions (critical flags, sample submissions, lab results, requisition updates, maintenance updates).

2. **Delta Fetch**
   - Each entity type tracks `updatedAt`/`version`. Fetch endpoints support `?updatedAfter=timestamp` to retrieve changes.
   - Conflict policy defaults to last-write-wins; critical fields (e.g., lab scores) flagged for review if overwritten.

3. **Outbound Queue**
   - Actions inserted into a queue with status (`pending`, `retrying`, `synced`, `failed`).
   - Background worker attempts to sync when network is available; exponential backoff; manual retry option in UI.

4. **Media Uploads**
   - Chunked uploads for photos/videos. After upload, metadata record synced via API referencing stored asset.
   - Offline attachments stored on device until upload confirmed.

5. **Notifications**
   - Backend sends push notifications for new assignments, requisition status changes, flagged assets.
   - App retrieves additional bundle data via API and stores locally as part of the sync cycle.

## Security

- Tokens stored in platform secure enclave (Keychain/Keystore).
- Offline database encrypted (SQLCipher or OS-level encryption).
- Certificate pinning (optional) to mitigate MITM.
- Remote wipe / logout endpoint to clear device caches.

## Extensibility

- Module registration mechanism to toggle role access per user (feature flags).
- Plugin interfaces for new workflows (e.g., additional sampling parameters) without rewriting sync core.
- `core/map` exposes extension points for overlay layers (heatmaps, timeline layers) shared with the desktop MapLibre configuration.

## Interoperability with Web Platform

- Shared DTO schemas documented in `/docs/api/mobile-contracts.md` (to be created).
- Notification payload structure aligned with backend event bus.
- Reuse of existing water quality scoring API; mobile triggers post-lab submission with necessary authentication.

## Next Steps

1. Finalise API contract additions with backend team (critical flags, mobile requisitions, sampling workflow).
2. Create entity diagrams and ER model for local database tables.
3. Define event bus topics and push notification payloads.
4. Choose Flutter/React Native and scaffold base project (`mobile/app`).
5. Implement proof-of-concept for map module with offline tile caching and coordinate search.

---

This document is a living blueprint. Update it as architectural decisions evolve during development.
