import { createRoleHomeScreen } from '../shared/createRoleHomeScreen';

export default createRoleHomeScreen({
  title: 'PCRWR Lab Console',
  subtitle: 'Track incoming samples, capture lab analysis, and confirm water quality scores.',
  highlights: [
    {
      title: 'Sample Intake Queue',
      description: 'Verify receipt, note condition issues, and route urgent samples for rapid testing.'
    },
    {
      title: 'Lab Result Capture',
      description: 'Record measurements, attach lab sheets, and trigger scoring review workflows.'
    },
    {
      title: 'Trend Insights',
      description: 'Compare current values against historical data to surface anomalies worth escalation.'
    }
  ],
  quickActions: [
    {
      title: 'Monitor Pending Sync',
      description: 'Open the Sync tab to check for results waiting to upload to the central system.'
    },
    {
      title: 'Coordinate With Field Teams',
      description: 'Use the Tasks tab to follow up on samples requiring resubmission or clarification.'
    }
  ]
});
