import { createRoleHomeScreen } from '../shared/createRoleHomeScreen';

export default createRoleHomeScreen({
  title: 'RA Environment Hub',
  subtitle: 'Monitor critical assets, capture field evidence, and initiate requisitions while offline.',
  highlights: [
    {
      title: 'Critical Asset Watch',
      description: 'Review latest high-risk assets and log new flags with photos, notes, or voice clips.'
    },
    {
      title: 'Operational Snapshots',
      description: 'Capture quick updates from the field that sync back to the desktop dashboards.'
    },
    {
      title: 'Requisition Kickoff',
      description: 'Start land requisition drafts in low connectivity zones and submit once connected.'
    }
  ],
  quickActions: [
    {
      title: 'Launch Map Explorer',
      description: 'Switch to the Map tab to filter assets by status, sampling due dates, or maintenance needs.'
    },
    {
      title: 'Check Task Queue',
      description: 'Open the Tasks tab for assignments delegated by the District Manager or Tehsil Manager.'
    }
  ]
});
