# Offline Sync Strategy

The PRMSC Field Operations Mobile Suite must operate reliably in low-connectivity environments. This document outlines the synchronization model supporting offline capture and resilient data exchange with the backend.

## Guiding Principles

1. **Local-first interactions** — All critical workflows must be available offline. The UI writes to local storage immediately, providing immediate feedback and queueing outbound requests.
2. **Deterministic sync** — Synchronization happens in structured passes (pull, push, media uploads). Each pass leaves auditable logs.
3. **Conflict management** — The app adopts sensible defaults (last-write-wins) while preserving an audit history and allowing server-side resolution for contested records.
4. **Security & privacy** — Locally cached data is encrypted, and sensitive payloads (tokens, attachments) are handled carefully to avoid leaks if a device is compromised.

## Key Components

- **Local Database**: stores canonical copies of assets, requisitions, sampling assignments, maintenance records, outreach logs, notifications.
- **Outbound Queue Tables**: track unsynced actions with metadata (entity type, payload, timestamp, retry count, dependencies).
- **Sync Manager**: orchestrates pull/push cycles, triggered by app lifecycle events or background tasks. Supports manual sync requests.
- **Connectivity Monitor**: listens for network changes to resume queued operations automatically.

## Data Model Overview

```
Tables (local DB):
- assets (id, name, geometry, status, updatedAt, ...)
- requisitions (id, status, priority, updatedAt, ...)
- samples (id, assetId, status, collectedAt, syncedAt, ...)
- lab_results (id, sampleId, parametersJSON, syncedAt, ...)
- maintenance_records (id, assetId, type, cost, updatedAt, ...)
- outreach_events (id, location, attendees, syncedAt, ...)
- notifications (id, type, payloadJSON, read, ...)
- sync_meta (entity, lastSyncedAt)

Outbound Queues:
- queue_actions (id, type, entityId, payloadJSON, mediaRefs[], status, retryCount, createdAt)
- queue_media (id, filePath, mimeType, status, retryCount, createdAt)
```

## Sync Lifecycle

1. **Initial Bootstrap**
   - After login, app pulls down essential datasets (assets, assignments, relevant requisitions) filtered by user roles and tehsil scope.
   - Downloads offline map tiles earmarked for the user’s jurisdiction.

2. **Scheduled/Triggered Sync**
   - Pull Cycle:
     - For each entity type, call `GET /entity?updatedAfter=lastSyncedAt` to fetch delta updates.
     - Apply updates locally; mark `lastSyncedAt` accordingly.
   - Push Cycle:
     - Iterate over `queue_actions` in FIFO order.
     - For each action:
       1. Ensure required media uploaded first (if `mediaRefs` present) using `queue_media`.
       2. Submit payload to backend endpoint (POST/PUT).
       3. Handle response:
          - Success → mark queue item `synced`, update local entity with server state.
          - Validation error → mark `failed`, record reason, notify user.
          - Transient error → increment `retryCount`, reschedule with backoff.

3. **Media Upload Pipeline**
   - Upload media via dedicated endpoint (e.g., `POST /uploads`) returning remote URL or ID.
   - On success, update references in parent action payload.

4. **Conflict Resolution**
   - Default policy: Last server update wins. When pushing local updates, include `updatedAt` or `version` value; server rejects if stale.
   - On conflict, server responds with error, including latest entity snapshot. Client merges or prompts user to reapply changes.
   - Audit log: every pushed change includes metadata (userId, timestamp) stored on server.

5. **Error Handling**
   - Categorize as `transient` (network, 5xx), `auth` (token expired), `validation` (400), `conflict` (409).
   - Auth errors trigger silent token refresh; if refresh fails, prompt re-login.
   - Validation/conflict errors surface notifications to users for manual resolution.

6. **Background Tasks**
   - Android: WorkManager with constraints (unmetered network preferred but allow user override).
   - iOS: Background fetch / BGProcessingTaskRequest to process limited operations.
   - If background task truncated, state persists via queue tables; resumed on next trigger.

## Security Considerations

- **Encryption**: Use SQLCipher or equivalent to encrypt local DB. Media files stored in app sandbox; remove once uploaded.
- **Secure Storage**: JWT/refresh tokens stored in Keystore/Keychain; queue metadata avoids sensitive fields when possible.
- **Data Retention**: Provide remote wipe mechanism (server sends flag; next sync clears caches).

## Telemetry & Monitoring

- Track sync metrics: duration, bytes transferred, success/failure counts.
- Report anonymized telemetry to central logging (e.g., Sentry/Elastic) for diagnostics.
- Provide user-facing sync status indicator (e.g., “Last synced 5 min ago”).

## Outstanding Tasks

- Define API contracts for delta fetch endpoints and push payloads.
- Establish server-side conflict resolution guidelines (e.g., storing both versions, marking as needs review).
- Create test scenarios covering offline data entry, concurrent updates, and multi-device sync.
- Document fallback plan if a device remains offline beyond retention window (e.g., warning message, manual export).

---

By adhering to this strategy, the mobile app remains capable in the field while keeping backend data authoritative and consistent.
