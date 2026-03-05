# Mobile Requisition UI Plan

## Objectives
- Surface requisition workload directly in the mobile app so RA/BCC/DM/TM roles can review, capture due-diligence answers, and sync changes while offline.
- Provide a resilient experience: hydrate from SQLite cache before network fetch, show optimistic updates, defer mutations to the sync queue.
- Establish a detail view that mirrors the backend schema (location, land acquisition, utilization, due diligence, activity log) to unblock future write flows.

## Architecture Overview
1. **Navigation**
   - Add a dedicated `Requisitions` tab to the bottom navigator that hosts a native stack (`RequisitionStack`).
   - Screens: `RequisitionListScreen` (default), `RequisitionDetailScreen` (push on selection). Detail screen will later host edit modals.

2. **State & Data Layer**
   - Create `requisitionStore` (Zustand) to persist:
     - `summaries: RequisitionSummary[]`
     - `details: Record<string, RequisitionDetail>`
     - `statusFilter: 'all' | 'pending' | 'dm' | 'bcc' | 'cid' | 'completed'`
     - setters & helpers (`setSummaries`, `upsertDetail`, `setFilter`).
   - Queries (`react-query`):
     - `QueryKeys.requisitions` → `fetchRequisitions` (list).
     - `QueryKeys.requisitionDetail(id)` → `fetchRequisitionDetail` (detail).
   - Cache hydration:
     - On hook initialization, call `loadCachedRequisitions` and prime both summaries/details (payload stored per id).
     - On successful fetch, `persistRequisitions` with the normalized detail payload (list fetch will trigger per-id detail fetch for recent items or reuse server detail response when list includes enough fields).

3. **Hooks**
   - `useRequisitionsList()` → returns filtered list, loading state, refresh handler.
   - `useRequisitionDetail(id)` → returns detail record, triggers fetch if not cached, exposes `isFetching` for pull-to-refresh.

4. **UI Composition**
   - **List Screen**
     - Header summary card: total requisitions, urgent count, last sync timestamp.
     - Filter chips (All, My Desk, Pending Approval, Completed) based on status string heuristics.
     - `FlatList` of cards showing title, sequence #, role badges, status pill, last updated, due date.
   - **Detail Screen**
     - Collapsible sections implemented via `SectionCard` component with optional action buttons.
     - Sections: Summary, Location & Map (static for now, placeholder map preview), Due Diligence (render GOVT or PRIVATE question list with answers), Land Acquisition, Land Utilization, Activity Log, Attachments.
     - Provide sticky footer actions (`Log Update`, `Open Map`) as placeholders for future flows.
   - Shared UI bits
     - `StatusPill`, `KeyValueRow`, `AttachmentList`, `QuestionResponseList`.

5. **Offline / Sync UX**
   - Show `OfflineBadge` when `useSessionStatus` reports offline (later hooking into NetInfo) and guard detail sections with cached data.
   - When network fetch fails, rely on cached store; show toast/banner.

6. **Testing Plan**
   - Unit-test normalization helpers already in `prmscService` (deterministic). For UI prototype: rely on manual run via `npm run typecheck` + Expo preview on Android emulator/device to validate navigation, list rendering, and detail view.

## Next Steps
1. Implement `requisitionStore`, query keys, and hooks.
2. Build `RequisitionListScreen`, `RequisitionDetailScreen`, register the stack in the main navigator.
3. Add placeholder CTA(s) wired to console logs until backend mutation endpoints are ready.
4. Once the UI stabilizes, extend SQLite persistence to include draft responses and integrate with the sync queue.
