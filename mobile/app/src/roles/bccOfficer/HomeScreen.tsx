import { createRoleHomeScreen } from '../shared/createRoleHomeScreen';

export default createRoleHomeScreen({
  title: 'BCC Outreach Desk',
  subtitle: 'Plan community outreach, track requisitions, and document field engagement.',
  highlights: [
    {
      title: 'Outreach Calendar',
      description: 'Review upcoming outreach commitments and capture attendance or citizen feedback.'
    },
    {
      title: 'Requisition Pipeline',
      description: 'Update requisition statuses, add negotiation notes, and sync documents when back online.'
    },
    {
      title: 'Evidence Library',
      description: 'Attach photos, videos, or scanned forms to outreach activities for District Manager review.'
    }
  ],
  quickActions: [
    {
      title: 'Prioritize Land Requests',
      description: 'Use the Tasks tab to work through requisitions flagged by District or Tehsil Managers.'
    },
    {
      title: 'Coordinate With RA Teams',
      description: 'Jump into the Map tab to align outreach with critical asset locations.'
    }
  ]
});
