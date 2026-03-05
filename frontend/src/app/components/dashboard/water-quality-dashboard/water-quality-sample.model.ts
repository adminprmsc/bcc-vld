export type WaterQualitySampleStatus =
  | 'awaiting_assignment'
  | 'awaiting_collection'
  | 'collecting'
  | 'in_lab'
  | 'results_ready'
  | 'closed'
  | 'cancelled';

export type WaterQualityStatusCode =
  | 'critical_flagged'
  | 'assignment'
  | 'collection_started'
  | 'collection_complete'
  | 'in_lab'
  | 'results_posted'
  | 'closed'
  | 'cancelled';

export interface WaterQualityAttachment {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface WaterQualityStatusEvent {
  code: WaterQualityStatusCode;
  label: string;
  note: string;
  tone: 'info' | 'success' | 'warning' | 'critical';
  createdAt: string;
  createdBy: string | null;
  createdByName?: string;
}

export interface WaterQualityCollection {
  collectedAt: string | null;
  fieldNotes: string;
  location: { lat: number | null; lng: number | null } | null;
  attachments: WaterQualityAttachment[];
  collectedBy: string | null;
  collectedByName?: string;
}

export interface WaterQualityLabAnalysis {
  receivedAt: string | null;
  completedAt: string | null;
  analyst: string | null;
  analystName?: string;
  metrics: Record<string, unknown>;
  attachments: WaterQualityAttachment[];
  notes: string;
}

export interface WaterQualityComputedScore {
  indexName: string;
  value: number | null;
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'pending';
  updatedAt: string | null;
}

export interface WaterQualityPlanSnapshot {
  planId: string | null;
  title: string;
  category: string;
  tehsil: string;
  district: string;
}

export interface WaterQualityAssignedSamplerSummary {
  id: string;
  name?: string;
  role?: string;
}

export interface WaterQualitySample {
  id: string;
  planId: string | null;
  planSnapshot: WaterQualityPlanSnapshot;
  plan?: any;
  status: WaterQualitySampleStatus;
  statusHistory: WaterQualityStatusEvent[];
  assignedSamplerId: string | null;
  assignedSamplerName: string;
  assignedSampler?: WaterQualityAssignedSamplerSummary | string | null;
  assignedAt: string | null;
  collection: WaterQualityCollection | null;
  labAnalysis: WaterQualityLabAnalysis | null;
  computedScore: WaterQualityComputedScore | null;
  attachments: WaterQualityAttachment[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  createdByName?: string;
  updatedBy: string | null;
  updatedByName?: string;
}
