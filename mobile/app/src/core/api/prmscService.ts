import { http } from './httpClient';
import {
  fetchDashboardSnapshot as fetchDashboardSnapshotMock,
  fetchTasks as fetchTasksMock,
  fetchSyncStatus as fetchSyncStatusMock,
  fetchMapOverlays as fetchMapOverlaysMock,
  fetchRequisitions as fetchRequisitionsMock,
  fetchRequisitionDetail as fetchRequisitionDetailMock
} from './mockService';
import type {
  ActivityLogEntry,
  CivilStructure,
  DashboardMetric,
  DashboardSnapshot,
  Coordinates,
  DueDiligenceChecklist,
  LandAcquisitionBlock,
  LandUtilizationBlock,
  MachineryItem,
  MapOverlayCollection,
  MapOverlayFeature,
  MapFeature,
  MapViewport,
  MetricTone,
  ProgressUpdateEntry,
  RequisitionDetail,
  RequisitionPriority,
  RequisitionSummary,
  SyncChannelStatus,
  TaskItem,
  TaskStatus,
  UserSummary
} from '../types';

type ChecklistValue = string | number | boolean | null | undefined;

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return withFallback(
    async () => normalizeDashboard(await http.get<unknown>('/mobile/dashboard')),
    fetchDashboardSnapshotMock,
    'dashboard snapshot'
  );
}

export async function fetchTasks(): Promise<TaskItem[]> {
  return withFallback(
    async () => normalizeTasks(await http.get<unknown>('/mobile/tasks')),
    fetchTasksMock,
    'tasks'
  );
}

export async function submitTaskUpdate(taskId: string, payload?: unknown): Promise<{ success: boolean }>;
export async function submitTaskUpdate(taskId: string, payload: unknown = {}): Promise<{ success: boolean }> {
  await http.post(`/mobile/tasks/${taskId}/complete`, payload, { parseJson: false });
  return { success: true };
}

export async function fetchSyncStatus(): Promise<SyncChannelStatus[]> {
  return withFallback(
    async () => normalizeSyncStatus(await http.get<unknown>('/mobile/sync')),
    fetchSyncStatusMock,
    'sync status'
  );
}

export async function retrySyncChannel(channelId: string): Promise<{ success: boolean }> {
  await http.post(`/mobile/sync/${channelId}/retry`, undefined, { parseJson: false });
  return { success: true };
}

export async function fetchMapOverlays(): Promise<MapOverlayCollection> {
  return withFallback(
    async () => normalizeOverlayCollection(await http.get<unknown>('/mobile/map-overlays')),
    fetchMapOverlaysMock,
    'map overlays'
  );
}

export async function fetchRequisitions(): Promise<RequisitionSummary[]> {
  return withFallback(
    async () => normalizeRequisitionList(await http.get<unknown>('/requisition')),
    fetchRequisitionsMock,
    'requisitions'
  );
}

export async function fetchRequisitionDetail(id: string): Promise<RequisitionDetail> {
  return withFallback(
    async () => normalizeRequisitionDetail(await http.get<unknown>(`/requisition/${id}`)),
    () => fetchRequisitionDetailMock(id),
    `requisition ${id}`
  );
}

async function withFallback<T>(request: () => Promise<T>, fallback: () => Promise<T>, context: string): Promise<T> {
  try {
    return await request();
  } catch (error) {
    const status = getErrorStatus(error);
    if (status && status >= 400 && status < 500) {
      throw error;
    }
    console.warn(`Failed to fetch ${context}, using mock data`, error);
    return fallback();
  }
}

function normalizeDashboard(payload: unknown): DashboardSnapshot {
  const record = asRecord(payload);
  const metrics = asArray(record.metrics).map(normalizeMetric).filter(Boolean) as DashboardMetric[];
  const timeline = asArray(record.timeline)
    .map(normalizeTimelineEntry)
    .filter(Boolean) as DashboardSnapshot['timeline'];
  const generatedAt = typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString();
  return {
    metrics,
    timeline,
    generatedAt
  };
}

function normalizeTasks(payload: unknown): TaskItem[] {
  const record = asRecord(payload);
  return asArray(record.tasks)
    .map(normalizeTask)
    .filter((task): task is TaskItem => task !== null);
}

function normalizeSyncStatus(payload: unknown): SyncChannelStatus[] {
  const record = asRecord(payload);
  return asArray(record.channels)
    .map(row => {
      const item = asRecord(row);
      const id = asString(item.id);
      if (!id) {
        return null;
      }
      const status = isSyncStatus(item.status) ? item.status : 'pending';
      return {
        id,
        title: asString(item.title) ?? 'Sync channel',
        status,
        detail: asString(item.detail) ?? '',
        lastAttempt: asString(item.lastAttempt) ?? ''
      } satisfies SyncChannelStatus;
    })
    .filter((item): item is SyncChannelStatus => Boolean(item));
}

function normalizeOverlayCollection(payload: unknown): MapOverlayCollection {
  const record = asRecord(payload);
  const overlays = asRecord(record.overlays);
  const keys: Array<keyof MapOverlayCollection> = ['critical', 'sampling', 'maintenance', 'outreach'];
  return keys.reduce<MapOverlayCollection>((acc, key) => {
    const raw = overlays[key];
    const features = asArray(raw)
      .map(entry => {
        const feature = asRecord(entry);
        const id = asString(feature.id);
        const coordinates = isCoordinatePair(feature.coordinates);
        if (!id || !coordinates) {
          return null;
        }
        return {
          id,
          coordinates,
          title: asString(feature.title) ?? 'Asset',
          subtitle: asString(feature.subtitle) ?? undefined
        } as MapOverlayFeature;
      })
      .filter((feature): feature is MapOverlayFeature => feature !== null);
    acc[key] = features;
    return acc;
  }, {
    critical: [],
    sampling: [],
    maintenance: [],
    outreach: []
  });
}

function normalizeMetric(metric: unknown): DashboardMetric | null {
  const record = asRecord(metric);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  const tone = isMetricTone(record.tone) ? record.tone : 'primary';
  return {
    id,
    title: asString(record.title) ?? 'Untitled metric',
    value: typeof record.value === 'number' ? record.value : Number(record.value ?? 0),
    tone
  } satisfies DashboardMetric;
}

function normalizeTimelineEntry(entry: unknown): DashboardSnapshot['timeline'][number] | null {
  const record = asRecord(entry);
  const id = asString(record.id);
  const title = asString(record.title);
  const timestamp = asString(record.timestamp);
  if (!id || !title || !timestamp) {
    return null;
  }
  return {
    id,
    title,
    timestamp,
    description: asString(record.description) ?? undefined
  };
}

function normalizeTask(task: unknown): TaskItem | null {
  const record = asRecord(task);
  const id = asString(record.id);
  if (!id) {
    return null;
  }
  const status = isTaskStatus(record.status) ? record.status : 'pending';
  return {
    id,
    title: asString(record.title) ?? 'Field task',
    role: asString(record.role) ?? 'Field Team',
    due: asString(record.due) ?? '',
    status
  } satisfies TaskItem;
}

function normalizeRequisitionList(payload: unknown): RequisitionSummary[] {
  return asArray(payload)
    .map(normalizeRequisitionSummary)
    .filter((item): item is RequisitionSummary => Boolean(item));
}

function normalizeRequisitionSummary(entry: unknown): RequisitionSummary | null {
  const record = asRecord(entry);
  const id = asString(record._id) ?? asString(record.id);
  if (!id) {
    return null;
  }
  const priority = isRequisitionPriority(record.priority) ? record.priority : 'Medium';
  return {
    id,
    title: asString(record.title) ?? 'Requisition',
    purpose: asString(record.purpose) ?? '',
    status: asString(record.status) ?? 'Pending',
    priority,
    sequenceNumber: typeof record.sequenceNumber === 'number' ? record.sequenceNumber : undefined,
    requiredDate: asTimestamp(record.requiredDate),
    lastUpdated: asTimestamp(record.lastUpdated) ?? asTimestamp(record.updatedAt) ?? asTimestamp(record.dateCreated),
    requestedBy: normalizeUserSummary(record.requestedBy),
    assignedTo: normalizeUserSummary(record.assignedTo),
    tehsil: asString(record.tehsil),
    division: asString(record.division),
    district: asString(record.district),
    landType: asString(record.landType),
    estimatedValue: asString(record.estimatedValue)
  } satisfies RequisitionSummary;
}

function normalizeRequisitionDetail(payload: unknown): RequisitionDetail {
  const record = asRecord(payload);
  const summary = normalizeRequisitionSummary(record);
  if (!summary) {
    throw new Error('Invalid requisition payload');
  }
  const mapFeatures = asArray(record.mapFeatures)
    .map(normalizeGeojsonFeature)
    .filter((feature): feature is MapFeature => Boolean(feature));
  return {
    ...summary,
    description: asString(record.description),
    location: normalizeLocation(record.location),
    mapMarker: normalizeCoordinatesObject(record.mapMarker),
    mapViewport: normalizeViewport(record.mapViewport),
    mapFeatures,
    govtLandChecklist: normalizeChecklist(record.govtLandChecklist),
    privateLandChecklist: normalizeChecklist(record.privateLandChecklist),
    landAcquisition: normalizeLandAcquisition(record.landAcquisition),
    landUtilization: normalizeLandUtilization(record.landUtilization),
    activityLog: normalizeActivityLog(record.activityLog),
    supportingDocs: normalizeStringArray(record.supportingDocs),
    attachments: normalizeStringArray(record.attachments),
    remarks: asString(record.remarks)
  } satisfies RequisitionDetail;
}

function normalizeLocation(value: unknown): RequisitionDetail['location'] {
  const record = asRecord(value);
  const address = asString(record.address);
  const coordinates = normalizeCoordinatesObject(record.coordinates);
  if (!address && !coordinates) {
    return undefined;
  }
  return {
    address,
    coordinates
  };
}

function normalizeCoordinatesObject(value: unknown): Coordinates | undefined {
  const record = asRecord(value);
  const lat = asNumber(record.lat);
  const lng = asNumber(record.lng);
  if (lat === undefined || lng === undefined) {
    return undefined;
  }
  return { lat, lng };
}

function normalizeViewport(value: unknown): MapViewport | undefined {
  const record = asRecord(value);
  const center = normalizeCoordinatesObject(record.center);
  const zoom = asNumber(record.zoom);
  if (!center && zoom === undefined) {
    return undefined;
  }
  return {
    center,
    zoom
  };
}

function normalizeGeojsonFeature(value: unknown): MapFeature | null {
  const record = asRecord(value);
  if (record.type !== 'Feature') {
    return null;
  }
  const geometry = typeof record.geometry === 'object' && record.geometry !== null ? record.geometry : null;
  const properties = typeof record.properties === 'object' && record.properties !== null ? record.properties : undefined;
  return {
    type: 'Feature',
    geometry: geometry as MapFeature['geometry'],
    properties
  } satisfies MapFeature;
}

function normalizeChecklist(value: unknown): DueDiligenceChecklist | undefined {
  const record = asRecord(value);
  const entries = Object.entries(record).reduce<DueDiligenceChecklist>((acc, [key, raw]) => {
    if (!key) {
      return acc;
    }
    if (raw === null || typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
      acc[key] = raw as ChecklistValue;
      return acc;
    }
    acc[key] = typeof raw === 'undefined' ? undefined : (String(raw) as ChecklistValue);
    return acc;
  }, {});
  return Object.keys(entries).length ? entries : undefined;
}

function normalizeLandAcquisition(value: unknown): LandAcquisitionBlock | undefined {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const donor = normalizeDonor(record.donor);
  const land = normalizeLandDetails(record.land);
  const donation = normalizeDonation(record.donation);
  const verification = normalizeVerification(record.verification);
  const updatedAt = asTimestamp(record.updatedAt);
  const updatedBy = normalizeUserSummary(record.updatedBy);
  const block: LandAcquisitionBlock = {
    type: asString(record.type),
    status: asString(record.status),
    donor,
    land,
    donation,
    verification,
    updatedAt,
    updatedBy
  };
  return hasDefinedValue(block as Record<string, unknown>) ? block : undefined;
}

function normalizeDonor(value: unknown): LandAcquisitionBlock['donor'] {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const donor = {
    fullName: asString(record.fullName),
    cnic: asString(record.cnic),
    contactNumber: asString(record.contactNumber),
    address: asString(record.address),
    villageName: asString(record.villageName),
    tehsil: asString(record.tehsil),
    district: asString(record.district)
  };
  return hasDefinedValue(donor as Record<string, unknown>) ? donor : undefined;
}

function normalizeLandDetails(value: unknown): LandAcquisitionBlock['land'] {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const land = {
    khasraNumber: asString(record.khasraNumber),
    area: asString(record.area),
    landCategory: asString(record.landCategory),
    latitude: asNumber(record.latitude),
    longitude: asNumber(record.longitude),
    ownershipProof: asString(record.ownershipProof),
    mutationNumber: asString(record.mutationNumber),
    currentUse: asString(record.currentUse)
  };
  return hasDefinedValue(land as Record<string, unknown>) ? land : undefined;
}

function normalizeDonation(value: unknown): LandAcquisitionBlock['donation'] {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const attachedDocuments = normalizeStringArray(record.attachedDocuments);
  const donation = {
    donationType: asString(record.donationType),
    purpose: asString(record.purpose),
    willingnessDate: asTimestamp(record.willingnessDate),
    remarks: asString(record.remarks),
    attachedDocuments: attachedDocuments.length ? attachedDocuments : undefined
  };
  return hasDefinedValue(donation as Record<string, unknown>) ? donation : undefined;
}

function normalizeVerification(value: unknown): LandAcquisitionBlock['verification'] {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const verification = {
    verifiedBy: asString(record.verifiedBy),
    verifiedDate: asTimestamp(record.verifiedDate),
    approvedBy: asString(record.approvedBy),
    approvalStatus: asString(record.approvalStatus)
  };
  return hasDefinedValue(verification as Record<string, unknown>) ? verification : undefined;
}

function normalizeLandUtilization(value: unknown): LandUtilizationBlock | undefined {
  const record = asRecord(value);
  if (!Object.keys(record).length) {
    return undefined;
  }
  const overview = normalizeOverview(record.overview);
  const civilStructures = asArray(record.civilStructures)
    .map(normalizeCivilStructure)
    .filter((item): item is NonNullable<ReturnType<typeof normalizeCivilStructure>> => Boolean(item));
  const machinery = asArray(record.machinery)
    .map(normalizeMachinery)
    .filter((item): item is NonNullable<ReturnType<typeof normalizeMachinery>> => Boolean(item));
  const progressUpdates = asArray(record.progressUpdates)
    .map(normalizeProgressUpdate)
    .filter((item): item is NonNullable<ReturnType<typeof normalizeProgressUpdate>> => Boolean(item));
  const gallery = normalizeStringArray(record.gallery);
  const updatedAt = asTimestamp(record.updatedAt);
  const updatedBy = normalizeUserSummary(record.updatedBy);
  if (!overview && !civilStructures.length && !machinery.length && !progressUpdates.length && !gallery.length && !updatedAt && !updatedBy) {
    return undefined;
  }
  return {
    overview,
    civilStructures,
    machinery,
    progressUpdates,
    gallery,
    updatedAt,
    updatedBy
  } satisfies LandUtilizationBlock;
}

function normalizeOverview(value: unknown): LandUtilizationBlock['overview'] {
  const record = asRecord(value);
  const phase = asString(record.phase);
  const summary = asString(record.summary);
  const nextMilestone = asString(record.nextMilestone);
  if (!phase && !summary && !nextMilestone) {
    return undefined;
  }
  return { phase, summary, nextMilestone };
}

function normalizeCivilStructure(value: unknown) {
  const record = asRecord(value);
  const id = asString(record._id) ?? asString(record.id);
  const name = asString(record.name);
  if (!id || !name) {
    return null;
  }
  const attributes = asRecord(record.attributes);
  return {
    id,
    name,
    category: asString(record.category),
    status: asString(record.status),
    description: asString(record.description),
    attributes: Object.keys(attributes).length ? (attributes as Record<string, unknown>) : undefined,
    photos: normalizeStringArray(record.photos),
    updatedAt: asTimestamp(record.updatedAt),
    createdAt: asTimestamp(record.createdAt),
    updatedBy: normalizeUserSummary(record.updatedBy)
  } satisfies CivilStructure;
}

function normalizeMachinery(value: unknown) {
  const record = asRecord(value);
  const id = asString(record._id) ?? asString(record.id);
  const name = asString(record.name);
  if (!id || !name) {
    return null;
  }
  const attributes = asRecord(record.attributes);
  return {
    id,
    name,
    type: asString(record.type),
    status: asString(record.status),
    capacity: asString(record.capacity),
    manufacturer: asString(record.manufacturer),
    attributes: Object.keys(attributes).length ? (attributes as Record<string, unknown>) : undefined,
    photos: normalizeStringArray(record.photos),
    updatedAt: asTimestamp(record.updatedAt),
    createdAt: asTimestamp(record.createdAt),
    updatedBy: normalizeUserSummary(record.updatedBy)
  } satisfies MachineryItem;
}

function normalizeProgressUpdate(value: unknown) {
  const record = asRecord(value);
  const id = asString(record._id) ?? asString(record.id);
  const status = asString(record.status);
  if (!id || !status) {
    return null;
  }
  return {
    id,
    status,
    description: asString(record.description),
    progressDate: asTimestamp(record.progressDate),
    completionPercentage: asNumber(record.completionPercentage),
    attachments: normalizeStringArray(record.attachments),
    updatedBy: normalizeUserSummary(record.updatedBy),
    createdAt: asTimestamp(record.createdAt)
  } satisfies ProgressUpdateEntry;
}

function normalizeActivityLog(value: unknown): ActivityLogEntry[] {
  return asArray(value)
    .map(entry => {
      const record = asRecord(entry);
      const action = asString(record.action);
      const timestamp = asTimestamp(record.timestamp);
      const id = asString(record._id) ?? asString(record.id) ?? (action && timestamp ? `${action}-${timestamp}` : undefined);
      if (!id || !action || !timestamp) {
        return null;
      }
      const meta = asRecord(record.meta);
      const normalized: ActivityLogEntry = {
        id,
        action,
        timestamp,
        user: normalizeUserSummary(record.user),
        remarks: asString(record.remarks),
        nextStatus: asString(meta.toStatus)
      };
      return normalized;
    })
    .filter((entry): entry is ActivityLogEntry => entry !== null);
}

function normalizeUserSummary(value: unknown): UserSummary | undefined {
  if (typeof value === 'string' && value) {
    return { id: value, name: 'User' };
  }
  const record = asRecord(value);
  const id = asString(record._id) ?? asString(record.id) ?? asString(record.userId);
  if (!id) {
    return undefined;
  }
  const name =
    asString(record.name) ??
    asString(record.fullName) ??
    buildNameFromParts(asString(record.firstName), asString(record.lastName)) ??
    'User';
  return {
    id,
    name,
    role: asString(record.role) ?? asString(record.primaryRole) ?? asString(record.type),
    email: asString(record.email)
  } satisfies UserSummary;
}

function buildNameFromParts(first?: string, last?: string) {
  const parts = [first, last].filter(Boolean);
  return parts.length ? parts.join(' ') : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return value ? [value] : [];
  }
  return asArray(value)
    .map(asString)
    .filter((item): item is string => Boolean(item));
}

function hasDefinedValue(record: Record<string, unknown>): boolean {
  const values = Object.values(record);
  if (!values.length) {
    return false;
  }
  return values.some(value => {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'object') {
      return hasDefinedValue(value as Record<string, unknown>);
    }
    return true;
  });
}

function isCoordinatePair(value: unknown): [number, number] | null {
  if (Array.isArray(value) && value.length === 2) {
    const [lon, lat] = value;
    if (typeof lon === 'number' && typeof lat === 'number') {
      return [lon, lat];
    }
  }
  return null;
}

function isMetricTone(value: unknown): value is MetricTone {
  return value === 'primary' || value === 'warning' || value === 'critical';
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === 'pending' || value === 'in-progress' || value === 'blocked' || value === 'completed';
}

function isSyncStatus(value: unknown): value is SyncChannelStatus['status'] {
  return value === 'pending' || value === 'synced' || value === 'error';
}

function isRequisitionPriority(value: unknown): value is RequisitionPriority {
  return value === 'Low' || value === 'Medium' || value === 'High';
}

function asRecord(value: unknown): Record<string, any> {
  return typeof value === 'object' && value !== null ? (value as Record<string, any>) : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function asTimestamp(value: unknown): string | undefined {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  return undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: number } | undefined)?.status;
  return typeof status === 'number' ? status : undefined;
}
