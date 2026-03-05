import { createRoleHomeScreen } from '../shared/createRoleHomeScreen';

export default createRoleHomeScreen({
  title: 'Tehsil Manager Desk',
  subtitle: 'Capture new assets, close maintenance loops, and oversee tehsil-level performance.',
  highlights: [
    {
      title: 'Asset Onboarding',
      description: 'Draft new asset plans with geometry, media, and offline validation before submission.'
    },
    {
      title: 'Maintenance Execution',
      description: 'Log work orders, attach completion evidence, and sync updates for RA visibility.'
    },
    {
      title: 'Operational Snapshots',
      description: 'Record quick field updates and escalate blockers to District leadership when needed.'
    }
  ],
  quickActions: [
    {
      title: 'Review Assigned Tasks',
      description: 'Visit the Tasks tab to confirm maintenance requests and approve RA/BCC submissions.'
    },
    {
      title: 'Inspect Map Layers',
      description: 'Leverage the Map tab to prioritise maintenance routes and view outreach overlaps.'
    }
  ]
});
