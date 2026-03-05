# Role Journeys & Permissions

This document captures the detailed workflows, data needs, and permissions for each persona that will use the PRMSC Field Operations Mobile Suite.

## Common Foundations

- **Authentication**: All roles authenticate via the shared PRMSC identity service. Tokens include role claims (`ra-environment`, `bcc-officer`, `pcrwr-sampler`, `pcrwr-lab`, `tm`, `dm`).
- **Navigation**: Role-based home screens provide quick stats, pending tasks, and entry points to modules.
- **Map Explorer**: Each role can access the asset map with tailored overlays (critical flags, sampling assignments, outreach coverage, requisition status, maintenance markers).
- **Offline Mode**: All forms and data views allow offline usage with queued sync.

## RA Environment

**Objectives**
- Monitor all assets in their jurisdiction.
- Mark assets as critical based on offline feedback.
- Capture operational snapshots (photos, voice notes, text).
- Initiate new land requisitions.

**Key Screens & Actions**
- Home: critical asset count, pending follow-ups, latest maintenance alerts.
- Asset Map & List: filter by status (critical, due for sampling, maintenance pending).
- Critical Flag Form: select asset, attach evidence, specify reason/urgency.
- Operational Snapshot Form: quick note/photo upload tied to asset.
- Requisition Wizard: gather land details (location, owner info, documents) and submit to pipeline.

**Permissions**
- Read/write access to assets, critical flag records, operational snapshot records.
- Create requisitions (initial status `Draft` → `Submitted`).
- View requisition statuses, but cannot approve unless also assigned DM role.

## BCC Officer

**Objectives**
- Manage community outreach related to PRMSC infrastructure.
- Collect land requirement details and update requisition statuses.
- Document outreach events with evidence.

**Key Screens & Actions**
- Home: upcoming outreach events, requisition aging chart, tasks due.
- Land Intake Form: capture new land requirements, assign priority, attach supporting docs.
- Requisition Update: change status (Requested, Negotiation, Acquired), add notes.
- Outreach Planner: schedule sessions, checklists for messaging, attendance logs.
- Media Upload: photos/videos of outreach events; optional citizen feedback scans.

**Permissions**
- Create/update requisition records in collaboration with DM and TM.
- Read all assets; mark outreach activities but cannot flag critical assets.
- Access to communication templates and broadcast lists.

## PCRWR Sampler

**Objectives**
- Receive sampling assignments.
- Perform water sampling in the field with guided workflow.
- Submit sample data and chain-of-custody evidence.

**Key Screens & Actions**
- Home: today's assignments, pending uploads, map of sampling route.
- Assignment Detail: asset info, last sample date, instructions.
- Sampling Form: GPS capture, water quality parameters (pH, EC, TDS, Free Chlorine), sample ID barcode scan, photographs.
- Offline Queue: list of unsynced samples, ability to retry sync manually.

**Permissions**
- Read assigned assets, sampling history.
- Create sampling records; cannot modify records once synced (only supervisors can amend).
- Access to sampling SOP documents offline.

## PCRWR Lab Technician

**Objectives**
- Track incoming samples and lab workload.
- Enter lab analysis results and upload reports.
- Validate algorithm-generated water quality scores.

**Key Screens & Actions**
- Home: pending samples by due date, anomaly alerts.
- Sample Intake: confirm receipt, note condition issues.
- Lab Analysis Form: input lab-measured parameters, attach lab sheet PDF/photo.
- Quality Dashboard: view trend lines, compare current vs historical values.

**Permissions**
- Read sample submissions; update lab results.
- Trigger re-evaluation of water quality algorithm if data corrected.
- Cannot edit asset or requisition details.

## Tehsil Manager (TM)

**Objectives**
- Capture new asset plans while on-site.
- Manage maintenance actions and operational snapshots.
- Review tasks assigned from RA/BCC.

**Key Screens & Actions**
- Home: maintenance overdue, drafts awaiting submission, assigned requests.
- Asset Plan Creator: draw geometry (point/line/polygon), fill asset attributes, attach photos.
- Maintenance Update: log work performed, mark status, upload media.
- Operational Snapshot: quick update on asset state (similar to RA, but with managerial context).

**Permissions**
- Full CRUD on assets they manage, including maintenance actions.
- Approve or reject RA/BCC requests related to their tehsil.
- View requisition pipeline but limited to read-only unless delegated by DM.

## District Manager (DM)

**Objectives**
- Monitor land acquisition progress and approve requisitions.
- Oversee critical assets, sampling outcomes, outreach coverage.
- Assign tasks to RA/BCC/Sampler teams.

**Key Screens & Actions**
- Home: summary cards (requisition progress, critical assets, sampling compliance).
- Land Activity Dashboard: board view of requisition statuses, ability to approve/return submissions, add comments.
- Oversight Timeline: consolidated log of critical events per asset.
- Task Assignment: create tasks for field staff, set deadlines, monitor completion.

**Permissions**
- Approve/Reject requisitions.
- Modify asset priority flags.
- View all data across roles; cannot perform lab/sample data entry.

## Role Interactions

- RA’s critical flags automatically notify DM and PCRWR sampler queue.
- BCC updates requisition status, DM approves final acquisition.
- PCRWR sampler submissions notify lab; lab results update water quality dashboards and notify RA/TM of outcomes.
- TM maintenance updates feed back into RA dashboards and DM oversight.

## Future Considerations

- Optional "Support Staff" role for limited access (view-only, ticket creation).
- Feature flags for pilot deployments to individually enable modules per tehsil.
- Audit trails accessible to administrators showing sequence of actions per asset.

---

Use this document to ensure UX, API, and security decisions respect the needs and boundaries of each persona.
