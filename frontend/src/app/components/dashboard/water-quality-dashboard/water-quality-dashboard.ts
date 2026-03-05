import { Component, OnInit, computed, effect, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../shared/notification.service';
import { WaterQualitySamplesService } from './water-quality-samples.service';
import { WaterQualitySample, WaterQualitySampleStatus, WaterQualityStatusEvent } from './water-quality-sample.model';
import { ConsultantPlansService } from '../edcs-consultant-dashboard/consultant-plans.service';
import type { ConsultantPlan } from '../edcs-consultant-dashboard/consultant-plan.model';
import { MapWorkspaceComponent, MapWorkspacePlan, OperationalSnapshot } from '../../shared/maps/map-workspace.component';
import type { Feature } from 'geojson';

interface DashboardMetric {
  label: string;
  value: number;
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface TrendSeries {
  labels: string[];
  flagged: number[];
  collected: number[];
  results: number[];
}

interface ActivityEntry extends WaterQualityStatusEvent {
  sampleId: string;
  planTitle: string;
  status: WaterQualitySampleStatus;
}

interface CurrentUser {
  id: string;
  name: string;
  role: string;
}

type CollectionFormState = {
  collectedAt: string;
  notes: string;
  lat: string;
  lng: string;
};

type LabFieldType = 'text' | 'number' | 'textarea' | 'safety';

interface LabField {
  key: string;
  label: string;
  type: LabFieldType;
  placeholder?: string;
}

interface LabFieldGroup {
  key: string;
  title: string;
  columns?: number;
  fields: LabField[];
}

const LAB_FIELD_GROUPS: LabFieldGroup[] = [
  {
    key: 'site',
    title: 'Site details',
    columns: 2,
    fields: [
      { key: 'tehsil', label: 'Tehsil', type: 'text' },
      { key: 'locationName', label: 'Location / Village name', type: 'text', placeholder: 'Village or locality' },
      { key: 'settlementsOperational', label: 'Number of settlements operational', type: 'number', placeholder: 'e.g. 12' },
      { key: 'waterStatus', label: 'Status', type: 'text', placeholder: 'Operational status' }
    ]
  },
  {
    key: 'sensory',
    title: 'Sensory observations',
    columns: 3,
    fields: [
      { key: 'color', label: 'Color', type: 'text' },
      { key: 'taste', label: 'Taste', type: 'text' },
      { key: 'odour', label: 'Odour', type: 'text' },
      { key: 'ec', label: 'E.C', type: 'number' },
      { key: 'turbidity', label: 'Turbidity', type: 'number' },
      { key: 'physicalContamination', label: 'Physical contamination', type: 'text' }
    ]
  },
  {
    key: 'chemistry',
    title: 'Core chemistry (mg/L unless noted)',
    columns: 3,
    fields: [
      { key: 'ph', label: 'pH', type: 'number' },
      { key: 'hco3', label: 'HCO₃', type: 'number' },
      { key: 'co3', label: 'CO₃', type: 'number' },
      { key: 'calcium', label: 'Ca', type: 'number' },
      { key: 'magnesium', label: 'Mg', type: 'number' },
      { key: 'hardness', label: 'Hardness', type: 'number', placeholder: 'Total hardness' },
      { key: 'chloride', label: 'Cl', type: 'number' },
      { key: 'sodium', label: 'Na', type: 'number' },
      { key: 'potassium', label: 'K', type: 'number' },
      { key: 'sulfate', label: 'SO₄', type: 'number' },
      { key: 'nitrate', label: 'NO₃ (N)', type: 'number' },
      { key: 'tds', label: 'TDS', type: 'number' },
      { key: 'phosphate', label: 'PO₄²⁻', type: 'number' },
      { key: 'iron', label: 'Fe', type: 'number' },
      { key: 'nitrite', label: 'NO₂⁻', type: 'number' },
      { key: 'fluoride', label: 'F', type: 'number' }
    ]
  },
  {
    key: 'traceMetals',
    title: 'Trace metals (mg/L)',
    columns: 3,
    fields: [
      { key: 'aluminum', label: 'Al', type: 'number' },
      { key: 'arsenic', label: 'As', type: 'number' },
      { key: 'barium', label: 'Ba', type: 'number' },
      { key: 'cadmium', label: 'Cd', type: 'number' },
      { key: 'cobalt', label: 'Co', type: 'number' },
      { key: 'chromium', label: 'Cr', type: 'number' },
      { key: 'copper', label: 'Cu', type: 'number' },
      { key: 'manganese', label: 'Mn', type: 'number' },
      { key: 'molybdenum', label: 'Mo', type: 'number' },
      { key: 'nickel', label: 'Ni', type: 'number' },
      { key: 'lead', label: 'Pb', type: 'number' },
      { key: 'strontium', label: 'Sr', type: 'number' },
      { key: 'zinc', label: 'Zn', type: 'number' }
    ]
  },
  {
    key: 'microbiology',
    title: 'Contamination indicators',
    columns: 2,
    fields: [
      { key: 'chemicalContamination', label: 'Chemical contamination', type: 'text' },
      { key: 'totalColiforms', label: 'Total coliforms', type: 'number' },
      { key: 'fecalColiforms', label: 'Fecal coliforms', type: 'number' },
      { key: 'ecoli', label: 'E. coli', type: 'number' },
      { key: 'biologicalContamination', label: 'Biological contamination', type: 'text' }
    ]
  },
  {
    key: 'summary',
    title: 'Lab summary',
    columns: 1,
    fields: [
      { key: 'remarks', label: 'Remarks', type: 'textarea', placeholder: 'Observations, recommended actions, etc.' },
      { key: 'safe', label: 'Overall safety', type: 'safety' }
    ]
  }
];

const LAB_FIELD_MAP = new Map<string, LabField>();
LAB_FIELD_GROUPS.forEach(group => {
  group.fields.forEach(field => {
    LAB_FIELD_MAP.set(field.key, field);
  });
});

const LAB_EXTRA_KEYS = ['unsafe'];

function createEmptyLabForm(): Record<string, string> {
  const result: Record<string, string> = {};
  LAB_FIELD_GROUPS.forEach(group => {
    group.fields.forEach(field => {
      result[field.key] = '';
    });
  });
  LAB_EXTRA_KEYS.forEach(key => {
    result[key] = '';
  });
  return result;
}

function isAffirmativeMetric(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0;
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase();
    return ['yes', 'true', '1', 'safe'].includes(text);
  }
  return false;
}

function resolveSafetyFromMetrics(metrics?: Record<string, unknown>): 'safe' | 'unsafe' | '' {
  if (!metrics) {
    return '';
  }
  if (isAffirmativeMetric(metrics['safe'])) {
    return 'safe';
  }
  if (isAffirmativeMetric(metrics['unsafe'])) {
    return 'unsafe';
  }
  return '';
}

@Component({
  selector: 'app-water-quality-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, MapWorkspaceComponent],
  templateUrl: './water-quality-dashboard.html',
  styleUrl: './water-quality-dashboard.scss'
})
export class WaterQualityDashboard implements OnInit {
  private readonly samplesService = inject(WaterQualitySamplesService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly consultantPlansService = inject(ConsultantPlansService);

  readonly loading = signal(false);
  readonly planLoading = signal(false);
  readonly samples = signal<WaterQualitySample[]>([]);
  readonly plans = signal<ConsultantPlan[]>([]);
  readonly statusFilter = signal('');
  readonly tehsilFilter = signal('');
  readonly districtFilter = signal('');
  readonly searchTerm = signal('');
  readonly mineOnly = signal(false);
  readonly selectedSample = signal<WaterQualitySample | null>(null);
  readonly flagging = signal(false);
  readonly flagReason = signal('');
  readonly focusedPlanId = signal<string | null>(null);
  readonly collectionForm = signal<CollectionFormState>({
    collectedAt: this.toDateInput(new Date().toISOString()),
    notes: '',
    lat: '',
    lng: ''
  });
  readonly collectionFiles = signal<File[]>([]);
  readonly collectionSubmitting = signal<'start' | 'complete' | null>(null);

  readonly labFieldGroups = LAB_FIELD_GROUPS;
  readonly labForm = signal<Record<string, string>>(createEmptyLabForm());
  readonly labAttachments = signal<File[]>([]);
  readonly labSubmitting = signal<'submit' | null>(null);
  readonly labReceivedAt = signal(this.toDateInput(new Date().toISOString()));
  readonly labCompletedAt = signal(this.toDateInput(new Date().toISOString()));
  readonly labNotes = signal('');
  readonly labSafety = signal<'safe' | 'unsafe' | ''>('');

  private pendingSampleId: string | null = null;
  private lastCollectionSampleId: string | null = null;
  private lastLabSampleId: string | null = null;

  readonly user: CurrentUser = this.resolveCurrentUser();
  readonly isRaUser = this.normalizeRole(this.user.role) === 'raenvironment';
  readonly isSampler = this.normalizeRole(this.user.role) === 'pcrwrsampler';
  readonly isLabUser = this.normalizeRole(this.user.role) === 'pcrwrlab';

  readonly filteredSamples = computed(() => {
    const statusFilter = this.statusFilter().trim().toLowerCase();
    const tehsilFilter = this.tehsilFilter().trim().toLowerCase();
    const districtFilter = this.districtFilter().trim().toLowerCase();
    const query = this.searchTerm().trim().toLowerCase();
    const mineOnly = this.mineOnly();
    const userId = this.user.id;
    const role = this.user.role;

    return this.samples()
      .filter(sample => {
        if (statusFilter && sample.status.toLowerCase() !== statusFilter) {
          return false;
        }
        const tehsil = (sample.planSnapshot?.tehsil || '').toLowerCase();
        if (tehsilFilter && !tehsil.includes(tehsilFilter)) {
          return false;
        }
        const district = (sample.planSnapshot?.district || '').toLowerCase();
        if (districtFilter && !district.includes(districtFilter)) {
          return false;
        }
        if (query) {
          const haystack = [
            sample.planSnapshot?.title,
            sample.assignedSamplerName,
            sample.planSnapshot?.tehsil,
            sample.planSnapshot?.district,
            sample.computedScore?.rating
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) {
            return false;
          }
        }
        if (mineOnly && userId) {
          return this.isMine(sample, userId, role);
        }
        return true;
      })
      .sort((a, b) => this.sortByUpdatedAt(b) - this.sortByUpdatedAt(a));
  });

  readonly metrics = computed<DashboardMetric[]>(() => this.buildMetrics(this.samples()));

  readonly tehsilOptions = computed(() => this.buildOptionList(this.samples().map(sample => sample.planSnapshot?.tehsil)));
  readonly districtOptions = computed(() => this.buildOptionList(this.samples().map(sample => sample.planSnapshot?.district)));
  private readonly statusOrder: WaterQualitySampleStatus[] = [
    'awaiting_assignment',
    'awaiting_collection',
    'collecting',
    'in_lab',
    'results_ready',
    'closed',
    'cancelled'
  ];

  readonly statusOptions = computed(() => {
    const values = new Set<WaterQualitySampleStatus>();
    this.samples().forEach(sample => values.add(sample.status));
    return this.statusOrder.filter(status => values.has(status));
  });

  readonly trendSeries = computed<TrendSeries>(() => this.buildTrendSeries(this.samples()));
  readonly flaggedSparkline = computed(() => this.seriesToPoints(this.trendSeries().flagged));
  readonly collectedSparkline = computed(() => this.seriesToPoints(this.trendSeries().collected));
  readonly resultsSparkline = computed(() => this.seriesToPoints(this.trendSeries().results));

  readonly recentActivity = computed<ActivityEntry[]>(() => this.buildActivityFeed(this.samples()));
  readonly selectedTimeline = computed<WaterQualityStatusEvent[]>(() => this.selectedSample()?.statusHistory || []);
  readonly mapPlans = computed<MapWorkspacePlan[]>(() => this.buildMapPlans(this.plans()));
  readonly highlightedPlanId = computed(() => {
    const selected = this.selectedSample()?.planId ?? null;
    return selected || this.focusedPlanId();
  });
  readonly selectedPlan = computed<ConsultantPlan | null>(() => {
    const planId = this.focusedPlanId() || this.selectedSample()?.planId || null;
    if (!planId) {
      return null;
    }
    return this.plans().find(plan => plan.id === planId) || null;
  });
  readonly selectedPlanHasActiveSample = computed(() => {
    const plan = this.selectedPlan();
    if (!plan) {
      return false;
    }
    return this.samples().some(sample => sample.planId === plan.id && this.isSampleActive(sample));
  });
  readonly canFlagSelectedPlan = computed(() => this.isRaUser && !!this.selectedPlan() && !this.selectedPlanHasActiveSample());
  readonly samplerCanEditSelected = computed(() => {
    if (!this.isSampler) {
      return false;
    }
    const sample = this.selectedSample();
    if (!sample) {
      return false;
    }
    const assignedToMe = sample.assignedSamplerId === this.user.id;
    return assignedToMe && (sample.status === 'awaiting_collection' || sample.status === 'collecting');
  });
  readonly samplerCanSubmit = computed(() => this.samplerCanEditSelected());
  readonly samplerCollectionAttachments = computed(() => this.selectedSample()?.collection?.attachments || []);
  readonly labExistingAttachments = computed(() => this.selectedSample()?.labAnalysis?.attachments || []);
  readonly labCanEditSelected = computed(() => {
    if (!this.isLabUser) {
      return false;
    }
    const sample = this.selectedSample();
    if (!sample) {
      return false;
    }
    return sample.status === 'in_lab' || sample.status === 'results_ready';
  });
  readonly labCanSubmit = computed(() => this.labCanEditSelected());
  readonly labMetricsEntries = computed(() => this.buildLabMetricsEntries(this.selectedSample()));

  get statusFilterValue(): string {
    return this.statusFilter();
  }

  set statusFilterValue(value: string) {
    this.statusFilter.set(value || '');
  }

  get tehsilFilterValue(): string {
    return this.tehsilFilter();
  }

  set tehsilFilterValue(value: string) {
    this.tehsilFilter.set(value || '');
  }

  get districtFilterValue(): string {
    return this.districtFilter();
  }

  set districtFilterValue(value: string) {
    this.districtFilter.set(value || '');
  }

  get searchTermValue(): string {
    return this.searchTerm();
  }

  set searchTermValue(value: string) {
    this.searchTerm.set(value || '');
  }

  get flagReasonValue(): string {
    return this.flagReason();
  }

  set flagReasonValue(value: string) {
    this.flagReason.set(value ?? '');
  }

  constructor() {
    effect(() => {
      const list = this.filteredSamples();
      const selected = this.selectedSample();
      if (!list.length) {
        if (selected) {
          this.selectedSample.set(null);
        }
        this.seedCollectionForm(null);
        this.seedLabForm(null);
        return;
      }
      if (!selected || !list.some(item => item.id === selected.id)) {
        this.selectedSample.set(list[0]);
      }
      const activeSelection = this.selectedSample();
      if (activeSelection?.planId && !this.focusedPlanId()) {
        this.focusedPlanId.set(activeSelection.planId);
      }
      const trackedSampleId = activeSelection?.id || null;
      if (trackedSampleId !== this.lastCollectionSampleId) {
        this.lastCollectionSampleId = trackedSampleId;
        this.seedCollectionForm(activeSelection);
      }
      if (trackedSampleId !== this.lastLabSampleId) {
        this.lastLabSampleId = trackedSampleId;
        this.seedLabForm(activeSelection);
      }
    });
  }

  ngOnInit(): void {
    this.loadSamples();
    this.loadPlans();
  }

  refresh(): void {
    this.loadSamples();
    this.loadPlans();
  }

  selectSample(sample: WaterQualitySample): void {
    if (!sample) {
      return;
    }
    this.selectedSample.set(sample);
    this.focusedPlanId.set(sample.planId || null);
  }

  toggleMineOnly(): void {
    this.mineOnly.update(value => !value);
  }

  flagSelectedAsset(): void {
    if (!this.isRaUser) {
      return;
    }
    const plan = this.selectedPlan();
    if (!plan) {
      this.notificationService.push('Select an asset from the map to flag.', { type: 'warning' });
      return;
    }
    if (this.selectedPlanHasActiveSample()) {
      this.notificationService.push('An active sampling workflow already exists for this asset.', { type: 'warning' });
      return;
    }

    this.flagging.set(true);
    const reason = this.flagReason().trim();
    this.samplesService.flagAsset({ planId: plan.id, reason }).subscribe({
      next: sample => {
        this.flagging.set(false);
        this.pendingSampleId = sample?.id || null;
        this.flagReason.set('');
        this.focusedPlanId.set(plan.id);
        this.notificationService.push('Asset flagged for water quality sampling.', { type: 'success' });
        if (sample?.assignedSamplerName) {
          this.notificationService.push(`Auto-assigned to ${sample.assignedSamplerName}.`, { type: 'info' });
        }
        this.loadSamples();
        this.loadPlans();
      },
      error: err => {
        this.flagging.set(false);
        const message = err?.error?.msg || err?.message || 'Unable to flag asset for sampling';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  startFieldCollection(): void {
    if (!this.samplerCanEditSelected()) {
      this.notificationService.push('This sample is not assigned to you or cannot be updated.', { type: 'warning' });
      return;
    }
    const sample = this.selectedSample();
    if (!sample) {
      return;
    }
    const payload = this.buildCollectionPayload();
    this.collectionSubmitting.set('start');
    this.samplesService.startCollection(sample.id, payload).subscribe({
      next: () => {
        this.collectionSubmitting.set(null);
        this.pendingSampleId = sample.id;
        this.notificationService.push('Field collection progress saved.', { type: 'success' });
        this.loadSamples();
      },
      error: err => {
        this.collectionSubmitting.set(null);
        const message = err?.error?.msg || err?.message || 'Unable to update field collection';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  submitFieldCollection(): void {
    if (!this.samplerCanSubmit()) {
      this.notificationService.push('This sample is not assigned to you or is not ready for submission.', { type: 'warning' });
      return;
    }
    const sample = this.selectedSample();
    if (!sample) {
      return;
    }
    const payload = this.buildCollectionPayload();
    const attachments = this.collectionFiles();
    this.collectionSubmitting.set('complete');
    this.samplesService.completeCollection(sample.id, { ...payload, attachments }).subscribe({
      next: () => {
        this.collectionSubmitting.set(null);
        this.collectionFiles.set([]);
        this.pendingSampleId = sample.id;
        this.notificationService.push('Sample submitted to PCRWR Lab.', { type: 'success' });
        this.loadSamples();
      },
      error: err => {
        this.collectionSubmitting.set(null);
        const message = err?.error?.msg || err?.message || 'Unable to submit sample to lab';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  onCollectionFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      return;
    }
    this.collectionFiles.update(list => [...list, ...files]);
    if (input) {
      input.value = '';
    }
  }

  removeCollectionFile(index: number): void {
    this.collectionFiles.update(list => list.filter((_, idx) => idx !== index));
  }

  updateCollectionForm(patch: Partial<CollectionFormState>): void {
    this.collectionForm.update(state => ({ ...state, ...patch }));
  }

  labFormValue(key: string): string {
    return this.labForm()[key] ?? '';
  }

  updateLabField(key: string, value: string | number | null | undefined): void {
    const text = value === null || value === undefined ? '' : value.toString();
    this.labForm.update(form => ({ ...form, [key]: text }));
  }

  labFieldMeta(key: string): LabField | undefined {
    return LAB_FIELD_MAP.get(key);
  }

  updateLabTimestamp(kind: 'receivedAt' | 'completedAt', value: string): void {
    if (kind === 'receivedAt') {
      this.labReceivedAt.set(value || '');
    } else {
      this.labCompletedAt.set(value || '');
    }
  }

  updateLabNotes(value: string): void {
    this.labNotes.set(value ?? '');
  }

  setLabSafety(selection: 'safe' | 'unsafe' | ''): void {
    this.labSafety.set(selection);
    this.labForm.update(form => ({
      ...form,
      safe: selection === 'safe' ? 'Yes' : selection === 'unsafe' ? 'No' : '',
      unsafe: selection === 'unsafe' ? 'Yes' : selection === 'safe' ? 'No' : ''
    }));
  }

  onLabFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input?.files ?? []);
    if (!files.length) {
      return;
    }
    this.labAttachments.update(list => [...list, ...files]);
    if (input) {
      input.value = '';
    }
  }

  removeLabFile(index: number): void {
    this.labAttachments.update(list => list.filter((_, idx) => idx !== index));
  }

  submitLabResults(): void {
    if (!this.labCanSubmit()) {
      this.notificationService.push('Sample is not ready for lab submission.', { type: 'warning' });
      return;
    }
    const sample = this.selectedSample();
    if (!sample) {
      return;
    }

    const metrics = this.buildLabMetricsPayload();
    const payloadNotes = this.labNotes().trim();
    const receivedAtIso = this.fromDateInput(this.labReceivedAt());
    const completedAtIso = this.fromDateInput(this.labCompletedAt());

    this.labSubmitting.set('submit');
    this.samplesService
      .submitLabResults(sample.id, {
        receivedAt: receivedAtIso,
        completedAt: completedAtIso,
        notes: payloadNotes,
        metrics
      }, this.labAttachments())
      .subscribe({
        next: () => {
          this.labSubmitting.set(null);
          this.labAttachments.set([]);
          this.pendingSampleId = sample.id;
          this.notificationService.push('Lab results submitted.', { type: 'success' });
          this.loadSamples();
        },
        error: err => {
          this.labSubmitting.set(null);
          const message = err?.error?.msg || err?.message || 'Unable to submit lab results';
          this.notificationService.push(message, { type: 'critical' });
        }
      });
  }

  openConsultantPlan(sample: WaterQualitySample | null): void {
    if (!sample?.planId) {
      return;
    }
    this.router.navigate(['/edcs-consultant-dashboard'], { queryParams: { planId: sample.planId } });
  }

  onMapPlanFocused(planId: string | null): void {
    this.focusedPlanId.set(planId);
    if (!planId) {
      return;
    }
    const sample = this.samples().find(item => item.planId === planId);
    if (sample) {
      this.selectedSample.set(sample);
    }
  }

  statusLabel(status: WaterQualitySampleStatus): string {
    switch (status) {
      case 'awaiting_assignment':
        return 'Awaiting Assignment';
      case 'awaiting_collection':
        return 'Awaiting Collection';
      case 'collecting':
        return 'Field Sampling';
      case 'in_lab':
        return 'In Laboratory';
      case 'results_ready':
        return 'Results Ready';
      case 'closed':
        return 'Closed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  statusAccent(status: WaterQualitySampleStatus): string {
    switch (status) {
      case 'awaiting_assignment':
        return 'accent-warning';
      case 'awaiting_collection':
      case 'collecting':
        return 'accent-primary';
      case 'in_lab':
        return 'accent-warning';
      case 'results_ready':
        return 'accent-success';
      case 'closed':
        return 'accent-neutral';
      case 'cancelled':
        return 'accent-muted';
      default:
        return 'accent-neutral';
    }
  }

  ratingLabel(rating?: string | null): string {
    if (!rating || rating === 'pending') {
      return 'Pending';
    }
    return rating.charAt(0).toUpperCase() + rating.slice(1);
  }

  ratingAccent(rating?: string | null): string {
    switch (rating) {
      case 'excellent':
      case 'good':
        return 'rating-good';
      case 'fair':
        return 'rating-fair';
      case 'poor':
        return 'rating-poor';
      default:
        return 'rating-pending';
    }
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString();
  }

  timelineIcon(code: string): string {
    switch (code) {
      case 'critical_flagged':
        return 'error';
      case 'assignment':
        return 'assignment_turned_in';
      case 'collection_started':
        return 'science';
      case 'collection_complete':
        return 'local_shipping';
      case 'in_lab':
        return 'biotech';
      case 'results_posted':
        return 'fact_check';
      case 'closed':
        return 'task_alt';
      case 'cancelled':
        return 'block';
      default:
        return 'update';
    }
  }

  private loadSamples(): void {
    this.loading.set(true);
    this.samplesService.listSamples({ limit: 200 }).subscribe({
      next: samples => {
        this.samples.set(samples);
        if (this.pendingSampleId) {
          const pending = samples.find(item => item.id === this.pendingSampleId);
          if (pending) {
            this.selectedSample.set(pending);
            this.focusedPlanId.set(pending.planId || this.focusedPlanId());
          }
          this.pendingSampleId = null;
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        const message = err?.error?.msg || err?.message || 'Unable to load water quality samples';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  private loadPlans(): void {
    this.planLoading.set(true);
    this.consultantPlansService.listPlans().subscribe({
      next: plans => {
        const filtered = (plans || []).filter(plan => (plan.maintenanceOwnerRole || '').toLowerCase() === 'tehsil manager');
        this.plans.set(filtered);
        this.planLoading.set(false);
      },
      error: err => {
        this.planLoading.set(false);
        const message = err?.error?.msg || err?.message || 'Unable to load Tehsil Manager assets';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  private buildMapPlans(source: ConsultantPlan[]): MapWorkspacePlan[] {
    if (!Array.isArray(source) || !source.length) {
      return [];
    }

    const plans: MapWorkspacePlan[] = [];

    source.forEach(plan => {
      if (!plan) {
        return;
      }

      const feature = this.pickPrimaryFeature(plan.feature);
      if (!feature) {
        return;
      }

    const attributes = this.normaliseAttributes(plan.attributes);
    attributes['title'] = plan.title || attributes['title'] || '';
    attributes['assetType'] = plan.assetType || attributes['assetType'] || '';
    attributes['assetLabel'] = plan.assetLabel || attributes['assetLabel'] || '';
    attributes['tehsil'] = plan.tehsil || attributes['tehsil'] || '';
    attributes['district'] = plan.district || attributes['district'] || '';
    attributes['maintenanceOwner'] = plan.maintenanceOwnerName || attributes['maintenanceOwner'] || '';
    attributes['planId'] = plan.id;

      const commissioningDate = this.extractDate(attributes, [
        'commissioningDate',
        'commissionedAt',
        'commissioning_date',
        'commission_date'
      ]);

      const nextMaintenanceDate = this.extractDate(attributes, [
        'nextMaintenanceDate',
        'nextMaintenance',
        'nextMaintenance_date',
        'maintenanceDueAt'
      ]);

      const expectedLifespanYears = this.extractNumber(attributes, [
        'expectedLifespanYears',
        'lifespanYears',
        'expected_lifespan_years'
      ]);

      const enrichedFeature = this.attachFeatureMetadata(feature, plan);

      plans.push({
        id: plan.id,
        title: plan.title || plan.assetLabel || plan.category || 'Asset',
        category: plan.category || plan.assetType || 'Infrastructure',
        commissioningDate,
        nextMaintenanceDate,
        expectedLifespanYears,
        feature: enrichedFeature,
        attributes: { ...attributes },
        operationalData: this.extractOperationalSnapshot(attributes)
      });
    });

    return plans;
  }

  private isSampleActive(sample: WaterQualitySample | null | undefined): boolean {
    if (!sample) {
      return false;
    }
    return sample.status !== 'closed' && sample.status !== 'cancelled';
  }

  private buildMetrics(list: WaterQualitySample[]): DashboardMetric[] {
    const totals = {
      total: list.length,
      awaitingAssignment: list.filter(item => item.status === 'awaiting_assignment').length,
      fieldQueue: list.filter(item => item.status === 'awaiting_collection' || item.status === 'collecting').length,
      inLab: list.filter(item => item.status === 'in_lab').length,
      resultsReady: list.filter(item => item.status === 'results_ready').length
    };

    return [
      { label: 'Critical Assets Monitored', value: totals.total, accent: 'primary' },
      { label: 'Awaiting Assignment', value: totals.awaitingAssignment, accent: totals.awaitingAssignment ? 'warning' : 'neutral' },
      { label: 'Field Collection Queue', value: totals.fieldQueue, accent: totals.fieldQueue ? 'primary' : 'neutral' },
      { label: 'In Laboratory', value: totals.inLab, accent: totals.inLab ? 'warning' : 'neutral' },
      { label: 'Results Ready', value: totals.resultsReady, accent: totals.resultsReady ? 'success' : 'neutral' }
    ];
  }

  private buildTrendSeries(list: WaterQualitySample[]): TrendSeries {
    const days = this.buildRecentDays(7);
    const flagged = new Array(days.length).fill(0);
    const collected = new Array(days.length).fill(0);
    const results = new Array(days.length).fill(0);

    const dayIndex = new Map<string, number>();
    days.forEach((day, idx) => dayIndex.set(day.iso, idx));

    list.forEach(sample => {
      (sample.statusHistory || []).forEach(event => {
        const index = dayIndex.get(this.toDayKey(event.createdAt));
        if (index === undefined) {
          return;
        }
        switch (event.code) {
          case 'critical_flagged':
            flagged[index] += 1;
            break;
          case 'collection_complete':
            collected[index] += 1;
            break;
          case 'results_posted':
            results[index] += 1;
            break;
          default:
            break;
        }
      });
    });

    return {
      labels: days.map(day => day.label),
      flagged,
      collected,
      results
    };
  }

  private buildActivityFeed(list: WaterQualitySample[]): ActivityEntry[] {
    const entries: ActivityEntry[] = [];
    list.forEach(sample => {
      (sample.statusHistory || []).forEach(event => {
        entries.push({
          ...event,
          sampleId: sample.id,
          planTitle: sample.planSnapshot?.title || 'Unknown site',
          status: sample.status
        });
      });
    });
    return entries
      .sort((a, b) => this.toTimestamp(b.createdAt) - this.toTimestamp(a.createdAt))
      .slice(0, 20);
  }

  private sortByUpdatedAt(sample: WaterQualitySample): number {
    return this.sortByUpdatedAtDesc(sample.updatedAt, sample.createdAt);
  }

  private sortByUpdatedAtDesc(primary?: string | null, fallback?: string | null): number {
    const primaryDate = primary ? new Date(primary).getTime() : 0;
    const fallbackDate = fallback ? new Date(fallback).getTime() : 0;
    return primaryDate || fallbackDate || 0;
  }

  private toTimestamp(value?: string | null): number {
    return value ? new Date(value).getTime() || 0 : 0;
  }

  private buildOptionList(values: (string | null | undefined)[]): string[] {
    const set = new Set<string>();
    values.forEach(value => {
      const text = (value || '').trim();
      if (text) {
        set.add(text);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  private pickPrimaryFeature(input: unknown): Feature | null {
    const candidate = this.cloneGeoJson(input);
    if (!candidate) {
      return null;
    }

    if (Array.isArray(candidate)) {
      return this.ensureFeature(candidate[0]);
    }

    if (typeof candidate === 'object') {
      const candidateObj = candidate as { type?: string; features?: unknown };
      if (candidateObj.type === 'FeatureCollection' && Array.isArray(candidateObj.features)) {
        return this.ensureFeature(candidateObj.features[0]);
      }

      if (candidateObj.type === 'Feature') {
        return this.ensureFeature(candidateObj);
      }
    }

    return null;
  }

  private ensureFeature(value: unknown): Feature | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const feature = value as Feature;
    if (!feature.type || feature.type !== 'Feature') {
      return null;
    }
    if (!feature.geometry) {
      return null;
    }
    return this.cloneGeoJson(feature);
  }

  private attachFeatureMetadata(feature: Feature, plan: ConsultantPlan): Feature {
    const cloned = this.cloneGeoJson(feature);
    if (!cloned) {
      return feature;
    }
    const existingProps = ((cloned.properties ?? {}) as Record<string, unknown>);
    const properties = {
      ...existingProps,
      title: plan.title || plan.assetLabel || 'Asset',
      tehsil: plan.tehsil || '',
      district: plan.district || '',
      maintenanceOwner: plan.maintenanceOwnerName || '',
      category: plan.category || plan.assetType || '',
      priority: existingProps['priority'] || '',
      assetType: plan.assetType || ''
    } as Record<string, unknown>;
    cloned.properties = properties;
    return cloned;
  }

  private cloneGeoJson<T>(value: T): T | null {
    if (value === null || value === undefined) {
      return null;
    }
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return null;
    }
  }

  private normaliseAttributes(value: unknown): Record<string, any> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return { ...(value as Record<string, any>) };
  }

  private extractDate(attributes: Record<string, any>, keys: string[]): string | null {
    for (const key of keys) {
      const raw = attributes[key];
      if (!raw) {
        continue;
      }
      const date = new Date(raw);
      if (!Number.isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    return null;
  }

  private extractNumber(attributes: Record<string, any>, keys: string[]): number | null {
    for (const key of keys) {
      const raw = attributes[key];
      if (raw === null || raw === undefined || raw === '') {
        continue;
      }
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  }

  private extractOperationalSnapshot(attributes: Record<string, any>): OperationalSnapshot | null {
    const source = this.pickObject(attributes, [
      'operationalData',
      'operationalSnapshot',
      'operationsSnapshot'
    ]);

    if (!source) {
      return null;
    }

    const snapshot: OperationalSnapshot = {};

    const assignNumber = (keys: string[], target: keyof OperationalSnapshot) => {
      const raw = this.pickFirstValue(source, keys);
      if (raw === null || raw === undefined || raw === '') {
        return;
      }
      const value = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(value)) {
        snapshot[target] = value as never;
      }
    };

    const assignText = (keys: string[], target: keyof OperationalSnapshot) => {
      const raw = this.pickFirstValue(source, keys);
      if (raw === null || raw === undefined) {
        return;
      }
      const text = String(raw).trim();
      if (text) {
        snapshot[target] = text as never;
      }
    };

    assignNumber(['averageDailyRunHours', 'avgDailyRunHours'], 'averageDailyRunHours');
    assignNumber(['availabilityPercent', 'availability'], 'availabilityPercent');
    assignText(['lastInspectionDate', 'inspectionDate'], 'lastInspectionDate');
    assignNumber(['bulkMeterReadingProduction', 'bulkMeterProduction'], 'bulkMeterReadingProduction');
    assignText(['bulkMeterAttachment', 'bulkMeterAttachmentUrl'], 'bulkMeterAttachment');
    assignNumber(['energyConsumptionSubMeter', 'energyConsumption'], 'energyConsumptionSubMeter');
    assignNumber(['unitsImportKwh', 'unitsImport'], 'unitsImportKwh');
    assignNumber(['unitsExportKwh', 'unitsExport'], 'unitsExportKwh');
    assignNumber(['vfdProductionKw'], 'vfdProductionKw');
    assignNumber(['inverterProductionKw'], 'inverterProductionKw');
    assignText(['powerSource'], 'powerSource');
    assignText(['operationalNotes', 'notes'], 'operationalNotes');

    return Object.keys(snapshot).length ? snapshot : null;
  }

  private pickObject(source: Record<string, any>, keys: string[]): Record<string, unknown> | null {
    for (const key of keys) {
      const value = source[key];
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      return { ...(value as Record<string, unknown>) };
    }
    return null;
  }

  private pickFirstValue(source: Record<string, unknown>, keys: string[]): unknown {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        return source[key];
      }
    }
    return undefined;
  }

  private isMine(sample: WaterQualitySample, userId: string, role: string): boolean {
    if (!userId) {
      return false;
    }
    if (role === 'RA Environment') {
      return sample.createdBy === userId;
    }
    if (role === 'PCRWR Sampler') {
      return sample.assignedSamplerId === userId;
    }
    if (role === 'PCRWR Lab') {
      return sample.labAnalysis?.analyst === userId;
    }
    return (
      sample.createdBy === userId ||
      sample.assignedSamplerId === userId ||
      sample.labAnalysis?.analyst === userId
    );
  }

  private seriesToPoints(series: number[]): string {
    if (!series.length) {
      return '';
    }
    const max = Math.max(...series, 1);
    const step = series.length > 1 ? 100 / (series.length - 1) : 100;
    return series
      .map((value, index) => {
        const x = index * step;
        const scaled = max ? 36 - (value / max) * 36 : 36;
        return `${x.toFixed(1)},${scaled.toFixed(1)}`;
      })
      .join(' ');
  }

  private buildRecentDays(days: number): Array<{ iso: string; label: string }> {
    const out: Array<{ iso: string; label: string }> = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      out.push({
        iso: this.toDayKey(day.toISOString()),
        label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }
    return out;
  }

  private toDayKey(value: string | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date
      .getDate()
      .toString()
      .padStart(2, '0')}`;
  }

  private normalizeRole(value: string | null | undefined): string {
    return (value || '').replace(/\s+/g, '').toLowerCase();
  }

  private seedCollectionForm(sample: WaterQualitySample | null): void {
    if (!sample) {
      this.collectionForm.set({
        collectedAt: this.toDateInput(new Date().toISOString()),
        notes: '',
        lat: '',
        lng: ''
      });
      this.collectionFiles.set([]);
      return;
    }
    const collectedAt = sample.collection?.collectedAt || sample.updatedAt || sample.createdAt || new Date().toISOString();
    const location = sample.collection?.location || null;
    this.collectionForm.set({
      collectedAt: this.toDateInput(collectedAt),
      notes: sample.collection?.fieldNotes || '',
      lat: location?.lat !== undefined ? String(location.lat) : '',
      lng: location?.lng !== undefined ? String(location.lng) : ''
    });
    this.collectionFiles.set([]);
  }

  private seedLabForm(sample: WaterQualitySample | null): void {
    const defaults = createEmptyLabForm();
    if (!sample) {
      this.labForm.set(defaults);
      this.labAttachments.set([]);
      this.labNotes.set('');
      this.setLabSafety('');
      const nowInput = this.toDateInput(new Date().toISOString());
      this.labReceivedAt.set(nowInput);
      this.labCompletedAt.set(nowInput);
      return;
    }

    const metrics = (sample.labAnalysis?.metrics || {}) as Record<string, unknown>;
    const seeded: Record<string, string> = { ...defaults };
    Object.keys(seeded).forEach(key => {
      const value = metrics[key];
      if (value === undefined || value === null) {
        return;
      }
      seeded[key] = value.toString();
    });

    if (!seeded['tehsil']) {
      seeded['tehsil'] = sample.planSnapshot?.tehsil || '';
    }
    if (!seeded['locationName']) {
      seeded['locationName'] = sample.planSnapshot?.title || sample.planSnapshot?.district || '';
    }

    this.labForm.set(seeded);
    this.labAttachments.set([]);
    this.labNotes.set(sample.labAnalysis?.notes || '');
    this.setLabSafety(resolveSafetyFromMetrics(metrics));

    const receivedAt = sample.labAnalysis?.receivedAt || sample.statusHistory?.find(event => event.code === 'collection_complete')?.createdAt || sample.updatedAt;
    const completedAt = sample.labAnalysis?.completedAt || sample.updatedAt;
    this.labReceivedAt.set(this.toDateInput(receivedAt));
    this.labCompletedAt.set(this.toDateInput(completedAt));
  }

  private buildCollectionPayload(): { collectedAt?: string; fieldNotes?: string; location?: { lat: number; lng: number } | null } {
    const form = this.collectionForm();
    const collectedAtIso = form.collectedAt ? this.fromDateInput(form.collectedAt) : undefined;
    const location = this.buildLocation(form.lat, form.lng);
    const payload: { collectedAt?: string; fieldNotes?: string; location?: { lat: number; lng: number } | null } = {};
    if (collectedAtIso) {
      payload.collectedAt = collectedAtIso;
    }
    if (form.notes.trim()) {
      payload.fieldNotes = form.notes.trim();
    }
    if (location) {
      payload.location = location;
    }
    return payload;
  }

  private buildLabMetricsPayload(): Record<string, unknown> {
    const form = this.labForm();
    const metrics: Record<string, unknown> = {};

    this.labFieldGroups.forEach(group => {
      group.fields.forEach(field => {
        if (field.type === 'safety') {
          return;
        }
        const raw = (form[field.key] ?? '').toString().trim();
        if (!raw) {
          return;
        }
        if (field.type === 'number') {
          const num = Number.parseFloat(raw);
          if (Number.isFinite(num)) {
            metrics[field.key] = num;
          }
          return;
        }
        metrics[field.key] = raw;
      });
    });

    const safety = this.labSafety();
    if (safety === 'safe') {
      metrics['safe'] = 'Yes';
      metrics['unsafe'] = 'No';
    } else if (safety === 'unsafe') {
      metrics['safe'] = 'No';
      metrics['unsafe'] = 'Yes';
    } else {
      const safeText = (form['safe'] ?? '').toString().trim();
      const unsafeText = (form['unsafe'] ?? '').toString().trim();
      if (safeText) {
        metrics['safe'] = safeText;
      }
      if (unsafeText) {
        metrics['unsafe'] = unsafeText;
      }
    }

    return metrics;
  }

  private buildLabMetricsEntries(sample: WaterQualitySample | null): Array<{ key: string; title: string; entries: Array<{ label: string; value: string }> }> {
    if (!sample?.labAnalysis?.metrics) {
      return [];
    }
    const metrics = sample.labAnalysis.metrics as Record<string, unknown>;
    const safety = resolveSafetyFromMetrics(metrics);
    const groups: Array<{ key: string; title: string; entries: Array<{ label: string; value: string }> }> = [];

    this.labFieldGroups.forEach(group => {
      const entries: Array<{ label: string; value: string }> = [];
      group.fields.forEach(field => {
        if (field.type === 'safety') {
          if (safety) {
            entries.push({ label: field.label, value: safety === 'safe' ? 'Safe' : 'Unsafe' });
          }
          return;
        }
        const value = metrics[field.key];
        if (value === undefined || value === null) {
          return;
        }
        const text = value.toString().trim();
        if (!text) {
          return;
        }
        entries.push({ label: field.label, value: text });
      });

      if (group.key === 'summary') {
        const unsafeValue = metrics['unsafe'];
        if (isAffirmativeMetric(unsafeValue)) {
          entries.push({ label: 'Unsafe', value: 'Yes' });
        }
      }

      if (entries.length) {
        groups.push({ key: group.key, title: group.title, entries });
      }
    });

    return groups;
  }

  private buildLocation(latText: string, lngText: string): { lat: number; lng: number } | null {
    const lat = Number.parseFloat(latText);
    const lng = Number.parseFloat(lngText);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }

  private toDateInput(value: string | Date | null | undefined): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private fromDateInput(value: string): string | undefined {
    if (!value) {
      return undefined;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString();
  }

  private resolveCurrentUser(): CurrentUser {
    const stored = localStorage.getItem('user');
    if (!stored) {
      return { id: '', name: 'User', role: '' };
    }
    try {
      const parsed = JSON.parse(stored);
      return {
        id: parsed?.id || parsed?.userId || '',
        name: parsed?.name || 'User',
        role: parsed?.role || ''
      };
    } catch {
      return { id: '', name: 'User', role: '' };
    }
  }
}
