import type {
  DashboardSnapshot,
  MapOverlayCollection,
  RequisitionDetail,
  RequisitionSummary,
  SyncChannelStatus,
  TaskItem
} from '../types';

const demoNow = () => new Date().toISOString();

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  await delay();
  return {
    metrics: [
      { id: 'critical-assets', title: 'Critical Assets', value: 12, tone: 'critical' },
      { id: 'samples-today', title: 'Samples Today', value: 8, tone: 'primary' },
      { id: 'requisitions', title: 'Requisitions Pending', value: 5, tone: 'warning' },
      { id: 'tasks-due', title: 'Tasks Due', value: 9, tone: 'primary' }
    ],
    timeline: [
      { id: 'timeline-1', title: 'Sample collected at OHR-12', timestamp: '09:45', description: 'PCRWR Sampler' },
      { id: 'timeline-2', title: 'RA marked asset #304 critical', timestamp: '09:10', description: 'RA Environment' },
      { id: 'timeline-3', title: 'DM approved requisition RQ-219', timestamp: '08:40', description: 'District Manager' }
    ],
    generatedAt: demoNow()
  };
}

export async function fetchTasks(): Promise<TaskItem[]> {
  await delay();
  return [
    {
      id: 'task-1',
      title: 'Inspect OHR-12 filtration unit',
      role: 'RA Environment',
      due: 'Today · 16:00',
      status: 'in-progress'
    },
    {
      id: 'task-2',
      title: 'Verify requisition RQ-219 documents',
      role: 'BCC Officer',
      due: 'Tomorrow',
      status: 'pending'
    },
    {
      id: 'task-3',
      title: 'Approve maintenance request TM-456',
      role: 'District Manager',
      due: 'Overdue by 1 day',
      status: 'blocked'
    },
    {
      id: 'task-4',
      title: 'Upload lab results for sample #8821',
      role: 'PCRWR Lab',
      due: 'Completed · 07:10',
      status: 'completed'
    }
  ];
}

export async function fetchSyncStatus(): Promise<SyncChannelStatus[]> {
  await delay();
  return [
    {
      id: 'sampling',
      title: 'Sampling submissions',
      detail: '2 records queued',
      status: 'pending',
      lastAttempt: '08:45 · Weak signal'
    },
    {
      id: 'maintenance',
      title: 'Maintenance updates',
      detail: 'All up to date',
      status: 'synced',
      lastAttempt: '07:55 · Success'
    },
    {
      id: 'requisitions',
      title: 'Requisition approvals',
      detail: '1 record needs retry',
      status: 'error',
      lastAttempt: '06:10 · Auth expired'
    }
  ];
}

export async function fetchMapOverlays(): Promise<MapOverlayCollection> {
  await delay();
  return {
    critical: [
      {
        id: 'critical-1',
        coordinates: [72.9942, 33.7189],
        title: 'OHR-12',
        subtitle: 'Chaklala'
      }
    ],
    sampling: [
      {
        id: 'sampling-1',
        coordinates: [72.991, 33.72],
        title: 'Route Stop',
        subtitle: 'Sample pickup'
      }
    ],
    maintenance: [
      {
        id: 'maintenance-1',
        coordinates: [72.987, 33.722],
        title: 'Valve Check',
        subtitle: 'Pending review'
      }
    ],
    outreach: [
      {
        id: 'outreach-1',
        coordinates: [72.982, 33.725],
        title: 'Community Meeting',
        subtitle: 'BCC Outreach'
      }
    ]
  };
}

export async function submitTaskUpdate(taskId: string, payload?: unknown): Promise<{ success: boolean }> {
  await delay();
  return { success: true };
}

export async function retrySyncChannel(channelId: string): Promise<{ success: boolean }> {
  await delay();
  return { success: true };
}

const DEMO_REQUISITIONS: Record<string, RequisitionDetail> = {
  'rq-demo-001': {
    id: 'rq-demo-001',
    title: 'OHR-12 Expansion',
    purpose: 'Secure private plot for booster room construction',
    status: 'Pending DM Review',
    priority: 'High',
    sequenceNumber: 219,
    requiredDate: '2025-01-15T00:00:00.000Z',
    lastUpdated: '2025-01-05T10:20:00.000Z',
    requestedBy: { id: 'user-ra', name: 'Sara Malik', role: 'ra-environment' },
    assignedTo: { id: 'user-dm', name: 'Aftab Khan', role: 'dm' },
    tehsil: 'Gujar Khan',
    division: 'Rawalpindi',
    district: 'Rawalpindi',
    landType: 'Private Land',
    estimatedValue: '5,000,000',
    description: 'Field survey identified the need for an additional pump room near OHR-12.',
    location: {
      address: 'Village Chakri, Gujar Khan',
      coordinates: { lat: 33.7196, lng: 72.9941 }
    },
    mapMarker: { lat: 33.7196, lng: 72.9941 },
    mapViewport: {
      center: { lat: 33.7196, lng: 72.9941 },
      zoom: 13
    },
    mapFeatures: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [72.9941, 33.7196]
        },
        properties: { kind: 'site-marker' }
      }
    ],
    privateLandChecklist: {
      P1: 'Option 1',
      P2: 'No',
      P33: 45
    },
    landAcquisition: {
      type: 'Private Land',
      status: 'Identification Pending',
      donor: {
        fullName: 'Muhammad Ali',
        contactNumber: '0300-1234567',
        tehsil: 'Gujar Khan',
        district: 'Rawalpindi'
      },
      land: {
        khasraNumber: '14/2',
        area: '3 Marla',
        landCategory: 'Residential',
        latitude: 33.7196,
        longitude: 72.9941
      },
      donation: {
        donationType: 'Voluntary',
        purpose: 'Pump room',
        willingnessDate: '2024-12-15T00:00:00.000Z',
        remarks: 'Needs legal vetting',
        attachedDocuments: ['willingness-letter.pdf']
      },
      verification: {
        verifiedBy: 'CID Team',
        approvalStatus: 'Pending'
      },
      updatedAt: '2025-01-05T10:10:00.000Z',
      updatedBy: { id: 'user-bcc', name: 'Hina Qureshi', role: 'bcc-officer' }
    },
    landUtilization: {
      overview: {
        phase: 'Planning',
        summary: 'Awaiting DM inspection',
        nextMilestone: 'Schedule on-site visit'
      },
      civilStructures: [
        {
          id: 'cs-1',
          name: 'Pump Room',
          status: 'Planned',
          photos: [],
          updatedAt: '2025-01-04T08:30:00.000Z',
          createdAt: '2025-01-04T08:30:00.000Z',
          updatedBy: { id: 'user-dm', name: 'Aftab Khan', role: 'dm' }
        }
      ],
      machinery: [],
      progressUpdates: [],
      gallery: [],
      updatedAt: '2025-01-04T08:30:00.000Z',
      updatedBy: { id: 'user-dm', name: 'Aftab Khan', role: 'dm' }
    },
    activityLog: [
      {
        id: 'log-1',
        action: 'Created',
        timestamp: '2025-01-02T09:00:00.000Z',
        user: { id: 'user-ra', name: 'Sara Malik', role: 'ra-environment' },
        remarks: 'Submitted initial requisition'
      },
      {
        id: 'log-2',
        action: 'Submitted to DM Review',
        timestamp: '2025-01-03T11:15:00.000Z',
        user: { id: 'user-ra', name: 'Sara Malik' },
        remarks: 'Auto-assigned to DM'
      }
    ],
    supportingDocs: ['vo-consent.pdf'],
    attachments: ['site-photo.jpg'],
    remarks: 'Need donor counseling before site visit.'
  }
};

export async function fetchRequisitions(): Promise<RequisitionSummary[]> {
  await delay();
  return Object.values(DEMO_REQUISITIONS).map(summarizeRequisition);
}

export async function fetchRequisitionDetail(id: string): Promise<RequisitionDetail> {
  await delay();
  return DEMO_REQUISITIONS[id] ?? Object.values(DEMO_REQUISITIONS)[0];
}

function summarizeRequisition(detail: RequisitionDetail): RequisitionSummary {
  return {
    id: detail.id,
    title: detail.title,
    purpose: detail.purpose,
    status: detail.status,
    priority: detail.priority,
    sequenceNumber: detail.sequenceNumber,
    requiredDate: detail.requiredDate,
    lastUpdated: detail.lastUpdated,
    requestedBy: detail.requestedBy,
    assignedTo: detail.assignedTo,
    tehsil: detail.tehsil,
    division: detail.division,
    district: detail.district,
    landType: detail.landType,
    estimatedValue: detail.estimatedValue
  };
}

function delay(ms = 200) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
