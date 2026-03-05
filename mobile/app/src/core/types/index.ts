export type MetricTone = 'primary' | 'critical' | 'warning';

export interface DashboardMetric {
  id: string;
  title: string;
  value: number;
  tone: MetricTone;
}

export interface TimelineEntry {
  id: string;
  title: string;
  timestamp: string;
  description?: string;
}

export interface DashboardSnapshot {
  metrics: DashboardMetric[];
  timeline: TimelineEntry[];
  generatedAt: string;
}

export type TaskStatus = 'in-progress' | 'pending' | 'blocked' | 'completed';

export interface TaskItem {
  id: string;
  title: string;
  role: string;
  due: string;
  status: TaskStatus;
}

export type SyncStatus = 'synced' | 'pending' | 'error';

export interface SyncChannelStatus {
  id: string;
  title: string;
  status: SyncStatus;
  detail: string;
  lastAttempt: string;
}

export interface SyncQueueItem {
  id: string;
  entity: 'task' | 'asset' | 'requisition' | 'sampling';
  referenceId: string;
  description: string;
  status: 'pending' | 'syncing' | 'synced' | 'error';
  lastAttempt?: string;
  errorMessage?: string;
  operation: SyncQueueOperation;
}

export type SyncQueueOperation =
  | {
      type: 'TASK_COMPLETE';
      taskId: string;
      payload?: unknown;
    };

export type OverlayKey = 'critical' | 'sampling' | 'maintenance' | 'outreach';

export interface MapOverlayFeature {
  id: string;
  coordinates: [number, number];
  title: string;
  subtitle?: string;
}

export type MapOverlayCollection = Record<OverlayKey, MapOverlayFeature[]>;

export type UserRole =
  | 'ra-environment'
  | 'bcc-officer'
  | 'pcrwr-sampler'
  | 'pcrwr-lab'
  | 'tm'
  | 'dm';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  roles: UserRole[];
  primaryRole: UserRole;
  tehsilId?: string;
  districtId?: string;
}

export type SessionStatus =
  | 'idle'
  | 'checking'
  | 'authenticating'
  | 'authenticated'
  | 'unauthenticated'
  | 'error';

export type RequisitionPriority = 'Low' | 'Medium' | 'High';

export interface UserSummary {
  id: string;
  name: string;
  role?: string;
  email?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapViewport {
  center?: Coordinates;
  zoom?: number;
}

export interface MapFeatureGeometry {
  type: string;
  coordinates?: unknown;
}

export interface MapFeature {
  type: 'Feature';
  geometry: MapFeatureGeometry | null;
  properties?: Record<string, unknown>;
}

export interface RequisitionLocation {
  address?: string;
  coordinates?: Coordinates;
}

export type DueDiligenceChecklist = Record<string, string | number | boolean | null | undefined>;

export interface ActivityLogEntry {
  id: string;
  action: string;
  timestamp: string;
  user?: UserSummary;
  remarks?: string;
  nextStatus?: string;
}

export interface LandAcquisitionDonor {
  fullName?: string;
  cnic?: string;
  contactNumber?: string;
  address?: string;
  villageName?: string;
  tehsil?: string;
  district?: string;
}

export interface LandAcquisitionLand {
  khasraNumber?: string;
  area?: string;
  landCategory?: string;
  latitude?: number;
  longitude?: number;
  ownershipProof?: string;
  mutationNumber?: string;
  currentUse?: string;
}

export interface LandDonationInfo {
  donationType?: string;
  purpose?: string;
  willingnessDate?: string;
  remarks?: string;
  attachedDocuments?: string[];
}

export interface LandVerificationInfo {
  verifiedBy?: string;
  verifiedDate?: string;
  approvedBy?: string;
  approvalStatus?: string;
}

export interface LandAcquisitionBlock {
  type?: string;
  status?: string;
  donor?: LandAcquisitionDonor;
  land?: LandAcquisitionLand;
  donation?: LandDonationInfo;
  verification?: LandVerificationInfo;
  updatedAt?: string;
  updatedBy?: UserSummary;
}

export interface CivilStructure {
  id: string;
  name: string;
  category?: string;
  status?: string;
  description?: string;
  attributes?: Record<string, unknown>;
  photos: string[];
  updatedAt?: string;
  createdAt?: string;
  updatedBy?: UserSummary;
}

export interface MachineryItem {
  id: string;
  name: string;
  type?: string;
  status?: string;
  capacity?: string;
  manufacturer?: string;
  attributes?: Record<string, unknown>;
  photos: string[];
  updatedAt?: string;
  createdAt?: string;
  updatedBy?: UserSummary;
}

export interface ProgressUpdateEntry {
  id: string;
  status: string;
  description?: string;
  progressDate?: string;
  completionPercentage?: number;
  attachments: string[];
  updatedBy?: UserSummary;
  createdAt?: string;
}

export interface LandUtilizationBlock {
  overview?: {
    phase?: string;
    summary?: string;
    nextMilestone?: string;
  };
  civilStructures: CivilStructure[];
  machinery: MachineryItem[];
  progressUpdates: ProgressUpdateEntry[];
  gallery: string[];
  updatedAt?: string;
  updatedBy?: UserSummary;
}

export interface RequisitionSummary {
  id: string;
  title: string;
  purpose: string;
  status: string;
  priority: RequisitionPriority;
  sequenceNumber?: number;
  requiredDate?: string;
  lastUpdated?: string;
  requestedBy?: UserSummary;
  assignedTo?: UserSummary;
  tehsil?: string;
  division?: string;
  district?: string;
  landType?: string;
  estimatedValue?: string;
}

export interface RequisitionDetail extends RequisitionSummary {
  description?: string;
  location?: RequisitionLocation;
  mapMarker?: Coordinates;
  mapViewport?: MapViewport;
  mapFeatures: MapFeature[];
  govtLandChecklist?: DueDiligenceChecklist;
  privateLandChecklist?: DueDiligenceChecklist;
  landAcquisition?: LandAcquisitionBlock;
  landUtilization?: LandUtilizationBlock;
  activityLog: ActivityLogEntry[];
  supportingDocs: string[];
  attachments: string[];
  remarks?: string;
}

