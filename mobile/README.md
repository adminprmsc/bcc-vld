# PRMSC Field Operations Mobile Suite

This workspace tracks the design and implementation of the mobile companion for the PRMSC Asset & Water Quality platform. The application targets Android and iOS devices and supports six core personas in the field: RA Environment, BCC Officer, PCRWR Sampler, PCRWR Lab Technician, Tehsil Manager (TM), and District Manager (DM).

## Vision

Deliver a resilient, offline-first mobile app that:

- Mirrors the desktop dashboards with role-specific controls.
- Captures geo-referenced operational data (critical asset flags, sampling details, outreach records, requisition updates).
- Syncs seamlessly with the existing PRMSC backend, triggering the water-quality scoring pipeline and maintenance workflows.
- Operates reliably in low-connectivity settings common across PRMSC service areas.

## Top-Level Capabilities

| Persona | Key Workflows |
| --- | --- |
| RA Environment | Map-based asset explorer, critical flag capture, operational snapshot logging, initiate land requisitions. |
| BCC Officer | Land intake forms, outreach planning & evidence capture, requisition status updates. |
| PCRWR Sampler | Receive sampling assignments, guided sampling forms (GPS, water parameters, media), offline queueing. |
| PCRWR Lab Technician | Sample intake tracking, lab result capture, score confirmation, trend review. |
| TM (Tehsil Manager) | Field asset onboarding, maintenance updates, operational snapshots. |
| DM (District Manager) | Land activity approvals, requisition dashboard updates, oversight of critical assets and quality trends. |

## Milestones

1. **Discovery & Architecture** — Confirm API surface, offline requirements, and shared component library. Produce architecture blueprint and role journeys.
2. **Core Foundation** — Implement authentication, role-based navigation, map module with offline tiles, local persistence, and sync engine.
3. **Role Modules (Iterations)** — Deliver RA/BCC/Sampler/Lab/TM/DM modules in staged sprints, including forms, workflows, and notification hooks.
4. **Dashboards & Analytics** — Embed micro-visualizations, asset timelines, and per-role insights consistent with the desktop theme.
5. **Pilot & Hardening** — Field testing, telemetry instrumentation, performance tuning, and documentation.

## Repository Structure

```
mobile/
├── README.md                 # Project overview (this file)
├── docs/
│   ├── architecture.md       # High-level architecture & data flow
│   ├── roles.md              # Detailed role journeys & permissions
│   ├── sync-strategy.md      # Offline/online synchronization blueprint
│   └── ui-style-guide.md     # Mobile UI design language & components
└── app/                      # Mobile application source (to be scaffolded)
```

> 🗒️  The `app/` directory will house the actual Flutter/React Native source once the UI kit and architecture are finalized.

## Getting Started (Planned)

- Choose Flutter (preferred) or React Native based on team skill set.
- Scaffold the project in `mobile/app/` with dedicated packages/modules for `auth`, `core`, `map`, `sync`, `roles/ra`, etc.
- Integrate continuous deployment via GitHub Actions or Bitrise for Android & iOS targets.
- Coordinate backend changes for mobile-friendly endpoints and notification webhooks.

## Next Steps

1. Produce `docs/architecture.md` describing client layers (presentation/domain/data), API contracts, and sync flows.
2. Document detailed task flows per role in `docs/roles.md`.
3. Define the offline-sync algorithm and queue processing strategy in `docs/sync-strategy.md`.
4. Draft a mobile UI style guide aligned with the dashboard theme.
5. Kick off scaffolding of the Flutter/React Native project under `mobile/app/`.

For coordination, capture decisions in the docs folder and link implementation tasks to issue trackers or the shared backlog.
