# Mobile UI Style Guide

This guide aligns the Field Operations mobile experience with the existing PRMSC design language while accommodating the unique needs of field crews.

## Visual Identity

- **Primary Palette**
  - Blue 500 `#2563EB` — action buttons, active states.
  - Blue 700 `#1D4ED8` — headers, key highlights.
  - Orange 500 `#F97316` — attention indicators (critical assets, alerts).
  - Slate 900 `#0F172A` — primary text.
  - Slate 600 `#475569` — secondary text, captions.
  - Slate 100 `#F1F5F9` — backgrounds, cards.

- **Typography**
  - Headings: `Inter` or `Roboto` SemiBold, scale: H1 24sp, H2 20sp, H3 18sp.
  - Body: `Inter`/`Roboto` Regular 15-16sp.
  - Supporting text: 13-14sp, high contrast.
  - Maintain line height 1.4–1.5 for readability.

- **Iconography**
  - Use feather/material icon sets for consistency with web UI.
  - Icons sized 24–32dp in app bar, 18–24dp in lists.

## Layout & Navigation

- **Navigation Structure**
  - Bottom navigation for frequent modules (Home, Map, Tasks, Inbox) with role-based variations.
  - Role-specific FAB (Floating Action Button) to launch primary action (e.g., “Flag Critical”, “New Sample”).
  - Drawer or profile sheet for secondary utilities (settings, offline data usage, help).

- **Cards & Lists**
  - Use elevated cards (elevation/shadow depth 1-2) for asset summaries, tasks.
  - Provide colored side indicators for status (critical, overdue, completed).
  - Ensure list items have 16dp padding and large touch targets (>48dp).

- **Forms**
  - Multi-step wizards for complex workflows (sampling, requisition, maintenance).
  - Persist draft state automatically to local storage.
  - Provide inline validation, clear error messaging, and optional tooltips.

- **Charts & Dashboards**
  - Spark lines for trends, donut charts for completion, bar charts for counts.
  - Maintain consistent color mapping (e.g., blue for completed, orange for pending, red for critical).
  - Provide quick filter chips to toggle time ranges (7d, 30d, 90d).

## Map Experience

- Map occupies majority of screen in explorer mode; collapse/expand bottom sheet for asset details.
- Basemap selector (icon toggle) for Standard, Satellite, Terrain, Dark.
- Search bar with coordinate/address input and suggestion dropdown.
- Clustering for asset markers to avoid clutter at low zoom levels.
- Use consistent marker shapes: critical (triangle), sampling (circle), requisition (square), maintenance (hex).

## Accessibility

- Minimum contrast ratio 4.5:1 for text/background.
- Support dynamic font sizing (OS accessibility).
- Localization ready (strings externalized, LTR/RTL layout considerations).
- Provide haptic feedback for success/error states where appropriate.

## Notifications & Alerts

- In-app banners for sync status (“Syncing…”, “Offline”, “Upload failed”).
- Task reminders show up in inbox and optionally as push notifications.
- Provide detailed activity logs accessible from profile/settings.

## Offline Modes

- Display offline badge in app bar when network unavailable.
- Queue counts shown alongside modules (e.g., “Samples (3 pending upload)”).
- Provide “Manage Storage” screen to clear cache, see tile downloads.

## Component Library Plan (Flutter example)

- `AppScaffold` — role-aware layout with bottom nav, FAB, app bar.
- `StatusCard`, `MetricCard` — summary metrics with icons and spark lines.
- `PRMSCButton` — primary/secondary/ghost variants respecting palette.
- `PRMSCFormField` — text/select/date components with validation states.
- `SyncStatusChip` — small component indicating sync state.
- `MapBottomSheet` — asset details with actions.
- `TimelineEntry` — reusable for asset history.

## Interaction Patterns

- Swipes: allow swipe actions on list items (e.g., mark task done). Provide “Undo” via snackbar.
- Long press: open quick actions on map pins.
- Step indicators: progress dots or bars in multi-step forms.
- Loading states: skeleton placeholders for lists and maps.

## Motion & Feedback

- Subtle transitions (200-300ms) between screens, bottom sheet slides.
- Avoid excessive animations to conserve battery.
- Provide success/failure toasts with actionable text (e.g., “Retry”).

## Example Screen Layouts (to be detailed in wireframes)

1. **Role Home** — metric cards, list of pending actions, quick navigation chips.
2. **Asset Detail** — map snapshot, tabs for timeline, maintenance, sampling, requisitions.
3. **Sampling Workflow** — stepper: (1) Preparation, (2) Measurements, (3) Media, (4) Review & Queue.
4. **Requisition Board** — Kanban-style columns with drag-to-update (online only, fallback to status picker offline).
5. **Sync Center** — list of queued items, filters by type, manual retry controls.

---

Use this guide when crafting wireframes, mockups, and reusable components to ensure a cohesive look and feel across all mobile modules.
