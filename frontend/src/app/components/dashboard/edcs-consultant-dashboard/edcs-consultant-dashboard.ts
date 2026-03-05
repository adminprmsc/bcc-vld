import { Component, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup, AbstractControl } from '@angular/forms';
import { Subscription, of, throwError } from 'rxjs';
import { catchError, finalize, switchMap } from 'rxjs/operators';
import type { Feature, Geometry } from 'geojson';
import { MapWorkspaceComponent, MapWorkspacePlan, OperationalSnapshot } from '../../shared/maps/map-workspace.component';
import { AssetLayerToggleComponent } from '../../shared/maps/asset-layer-toggle.component';
import { ConsultantPlansService } from './consultant-plans.service';
import type { ConsultantPlanAttachment } from './consultant-plan.model';
import { RequisitionsService } from '../../requisitions/requisitions.service';
import { NotificationService } from '../../shared/notification.service';
import { PdfReportService } from '../../../services/pdf-report.service';
import { AssetLayerService, MaintenanceRecord } from '../../../services/asset-layer.service';
import { MapLayerIntegrationService } from '../../../services/map-layer-integration.service';

interface AssetDefinition {
  value: string;
  label: string;
  category: string;
}

interface AssetGroup {
  category: string;
  assets: AssetDefinition[];
}

interface ConsultantPlan {
  id: string;
  title: string;
  assetType: string;
  assetLabel: string;
  category: string;
  layerName: string;
  description: string;
  requisitionId: string | null;
  tehsil: string;
  district: string;
  feature: Feature | null;
  attributes: Record<string, any>;
  coordinates?: PointCoordinates | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
  commissioningDate?: string | null;
  nextMaintenanceDate?: string | null;
  expectedLifespanYears?: number | null;
  maintenanceHistory?: MaintenanceRecord[];
  operationalData?: OperationalSnapshot | null;
  operationalSnapshotHistory?: OperationalSnapshotHistoryEntry[];
  ohrRecurringHistory?: OhrRecurringHistoryEntry[];
}

interface SiteOption {
  id: string;
  title: string;
  tehsil: string;
  district: string;
  status: string;
}

type GeometryClass = 'line' | 'point' | 'area' | 'unknown';

interface PointCoordinates {
  lat: number;
  lng: number;
}

interface AssetFieldOption {
  label: string;
  value: string;
}

interface AssetFieldConfig {
  control: string;
  label: string;
  attributeKey?: string;
  aliases?: string[];
  type?: 'text' | 'number' | 'select' | 'date';
  role?: 'input' | 'section';
  placeholder?: string;
  unit?: string;
  description?: string;
  required?: boolean;
  frequencyLabel?: string;
  note?: string;
  options?: AssetFieldOption[];
}

interface AssetFormConfig {
  assetTypes: string[];
  geometry: GeometryClass;
  title: string;
  summary: string;
  fields: AssetFieldConfig[];
}

interface AssetInsightMetric {
  id: string;
  label: string;
  unit?: string;
  value: string;
  delta: string;
  deltaDirection: 'up' | 'down' | 'steady';
  points: string;
  series: number[];
}

interface AssetInsightInfoItem {
  label: string;
  value: string;
}

interface AssetInsightTimelineEntry {
  label: string;
  dateLabel: string;
  description: string;
  tone: 'success' | 'warning' | 'critical' | 'neutral';
}

interface AssetInsightSnapshot {
  plan: ConsultantPlan;
  coordinates: PointCoordinates | null;
  locationLabel: string;
  metrics: AssetInsightMetric[];
  trendLabels: string[];
  trendHistory: OperationalSnapshotHistoryEntry[];
  healthScore: number;
  healthDescriptor: string;
  keyFacts: AssetInsightInfoItem[];
  maintenanceTimeline: AssetInsightTimelineEntry[];
  operationalNotes: string[];
  powerProfile: string | null;
}

interface OperationalSnapshotHistoryEntry {
  capturedAt: string;
  snapshot: OperationalSnapshot;
}

interface OhrRecurringHistoryEntry {
  capturedAt: string;
  values: Record<string, number | string>;
  attachment?: ConsultantPlanAttachment | null;
}

const LAYER_DEFAULT_NAME = 'PRMSC Red Book Assets';

const FALLBACK_DEFINITIONS: AssetDefinition[] = [
  { value: 'water-pipeline', label: 'Water Pipeline', category: 'Water Supply' },
  { value: 'overhead-reservoir', label: 'Overhead Reservoir (OHR)', category: 'Water Supply' },
  { value: 'stand-post', label: 'Stand Post', category: 'Water Supply' },
  { value: 'ro-plant', label: 'RO Plant', category: 'Water Supply' },
  { value: 'bore-hole', label: 'Bore Hole Location', category: 'Water Supply' },
  { value: 'tubewell-pump-room', label: 'Tubewell Pump Room', category: 'Water Supply' },
  { value: 'guard-room', label: 'Guard Room', category: 'Support Facility' },
  { value: 'solar-installation', label: 'Solar Installation', category: 'Support Facility' },
  { value: 'water-support-asset', label: 'Other Water Support Asset', category: 'Support Facility' },
  { value: 'abr', label: 'ABR', category: 'Sewerage' },
  { value: 'sewage-line', label: 'Sewage Line', category: 'Sewerage' },
  { value: 'manhole', label: 'Manhole', category: 'Sewerage' },
  { value: 'other-sewerage-asset', label: 'Other Sewerage Asset', category: 'Sewerage' },
  { value: 'custom-asset', label: 'Custom Asset', category: 'Custom' }
];

const OPERATIONAL_HISTORY_LIMIT = 24;
const OHR_RECURRING_HISTORY_LIMIT = 36;

const EXCLUDED_EXPORT_ATTRIBUTE_KEYS = new Set<string>([
  'operationalData',
  'operationalSnapshotHistory',
  'ohrRecurringHistory',
  'commissioningDate',
  'nextMaintenanceDate',
  'expectedLifespanYears',
  'createdAt',
  'updatedAt',
  'title',
  'assetType',
  'assetLabel',
  'category',
  'requisitionId',
  'tehsil',
  'district'
]);

const OPERATIONAL_SNAPSHOT_KEYS: Array<keyof OperationalSnapshot> = [
  'averageDailyRunHours',
  'availabilityPercent',
  'lastInspectionDate',
  'operationalNotes',
  'bulkMeterReadingProduction',
  'bulkMeterAttachment',
  'energyConsumptionSubMeter',
  'unitsImportKwh',
  'unitsExportKwh',
  'powerSource',
  'vfdProductionKw',
  'inverterProductionKw',
];

@Component({
  selector: 'app-edcs-consultant-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MapWorkspaceComponent, AssetLayerToggleComponent],
  templateUrl: './edcs-consultant-dashboard.html',
  styleUrl: './edcs-consultant-dashboard.scss'
})
export class EdcsConsultantDashboard implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private plansService = inject(ConsultantPlansService);
  private requisitionsService = inject(RequisitionsService);
  private notificationService = inject(NotificationService);
  private pdfReportService = inject(PdfReportService);
  private assetLayerService = inject(AssetLayerService);
  private mapLayerIntegrationService = inject(MapLayerIntegrationService);

  @ViewChild(MapWorkspaceComponent)
  private mapWorkspace?: MapWorkspaceComponent;

  private mapNeedsInitialFit = false;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly assetDefinitions = signal<AssetDefinition[]>(FALLBACK_DEFINITIONS);
  readonly planList = signal<ConsultantPlan[]>([]);
  readonly selectedPlan = signal<ConsultantPlan | null>(null);
  readonly availableSites = signal<SiteOption[]>([]);
  readonly filterCategory = signal('');
  readonly filterAssetType = signal('');
  readonly filterRequisition = signal('');
  readonly searchTerm = signal('');
  readonly draftSummary = signal('Draw the infrastructure footprint on the map.');
  readonly draftFeature = signal<Feature | null>(null);
  readonly currentFeature = computed(() => this.draftFeature() ?? this.selectedPlan()?.feature ?? null);
  readonly currentCoordinates = computed(() => this.extractPointCoordinates(this.currentFeature()));
  readonly currentCoordinateLabel = computed(() => {
    const coords = this.currentCoordinates();
    if (!coords) {
      return '';
    }
    const lat = coords.lat.toFixed(6);
    const lng = coords.lng.toFixed(6);
    return `${lat}, ${lng}`;
  });
  readonly hasDraft = computed(() => Boolean(this.draftFeature()));

  readonly filteredPlans = computed(() => {
    const plans = this.planList();
    const category = this.filterCategory().toLowerCase();
    const assetType = this.filterAssetType();
    const requisitionId = this.filterRequisition();
    const query = this.searchTerm().toLowerCase();
    const filtered = plans.filter(plan => {
      if (!plan) {
        return false;
      }
      if (category && plan.category.toLowerCase() !== category) {
        return false;
      }
      if (assetType && plan.assetType !== assetType) {
        return false;
      }
      if (requisitionId && plan.requisitionId !== requisitionId) {
        return false;
      }
      if (query) {
        const haystack = [plan.title, plan.assetLabel, plan.description, plan.tehsil, plan.district]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const aTime = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });
  });

  readonly assetGroups = computed<AssetGroup[]>(() => {
    const definitions = this.assetDefinitions();
    const grouped = new Map<string, AssetDefinition[]>();
    definitions.forEach(def => {
      if (!grouped.has(def.category)) {
        grouped.set(def.category, []);
      }
      grouped.get(def.category)!.push(def);
    });
    grouped.forEach(list => list.sort((a, b) => a.label.localeCompare(b.label)));
    const order = ['Water Supply', 'Sewerage', 'Support Facility', 'Custom'];
    const ordered: AssetGroup[] = [];
    order.forEach(category => {
      if (grouped.has(category)) {
        ordered.push({ category, assets: grouped.get(category)! });
        grouped.delete(category);
      }
    });
    grouped.forEach((assets, category) => {
      ordered.push({ category, assets });
    });
    return ordered;
  });

  readonly filterAssetOptions = computed<AssetDefinition[]>(() => {
    const category = this.filterCategory();
    const definitions = this.assetDefinitions();
    if (!category) {
      return definitions;
    }
    return definitions.filter(def => def.category.toLowerCase() === category.toLowerCase());
  });

  readonly visibleCategories = signal<Set<string>>(new Set<string>());

  readonly mapPlans = computed<MapWorkspacePlan[]>(() => {
    const allowed = this.visibleCategories();
    const allowAll = !allowed.size;
    return this.planList()
      .filter(plan => {
        if (allowAll) {
          return true;
        }
        const category = (plan.category || '').trim();
        return allowed.has(category);
      })
      .map(plan => ({
        id: plan.id,
  feature: cloneFeature(plan.feature),
        category: plan.category,
        title: plan.title,
        commissioningDate: plan.commissioningDate
          ?? plan.attributes?.['commissioningDate']
          ?? null,
        nextMaintenanceDate: plan.nextMaintenanceDate
          ?? this.resolveNextMaintenanceDate(plan.attributes)
          ?? null,
        expectedLifespanYears: plan.expectedLifespanYears
          ?? plan.attributes?.['expectedLifespanYears']
          ?? null,
        attributes: plan.attributes ?? {},
        operationalData: plan.operationalData ?? this.normaliseOperationalData(plan.attributes?.['operationalData'])
      }));
  });

  readonly assetKpis = computed(() => {
    const plans = this.planList();
    const total = plans.length;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const upcomingThreshold = new Date(todayStart.getTime());
    upcomingThreshold.setDate(upcomingThreshold.getDate() + 30);

    let overdue = 0;
    let dueSoon = 0;
    let unscheduled = 0;

    plans.forEach(plan => {
      const dueText = plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(plan.attributes);
      const dueDate = this.safeParseDate(dueText);
      if (!dueDate) {
        unscheduled += 1;
        return;
      }
      if (dueDate < todayStart) {
        overdue += 1;
        return;
      }
      if (dueDate >= todayStart && dueDate <= upcomingThreshold) {
        dueSoon += 1;
      }
    });

    return [
      { label: 'Total Assets', value: total, accent: 'primary' as const },
      { label: 'Maintenance Overdue', value: overdue, accent: overdue ? ('danger' as const) : ('success' as const) },
      { label: 'Due Within 30 Days', value: dueSoon, accent: dueSoon ? ('warning' as const) : ('neutral' as const) },
      { label: 'No Maintenance Date', value: unscheduled, accent: unscheduled ? ('neutral' as const) : ('success' as const) }
    ];
  });

  readonly pendingMaintenancePlans = computed<ConsultantPlan[]>(() => {
    const today = this.startOfDay(new Date());
    return this.planList()
      .map(plan => {
        const dueText = plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(plan.attributes);
        return {
          plan,
          due: this.safeParseDate(dueText),
        };
      })
      .filter(({ due }) => !due || due <= today)
      .sort((a, b) => {
        const aTime = a.due ? a.due.getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.due ? b.due.getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      })
      .map(item => item.plan);
  });

  readonly highlightedPlanId = computed(() => this.selectedPlan()?.id ?? null);

  readonly planForm = this.fb.group({
    assetType: ['', Validators.required],
    category: [{ value: '', disabled: true }],
    title: ['', Validators.required],
    requisitionId: [''],
    tehsil: [''],
    district: [''],
    description: [''],
    notes: [''],
    attributesJson: [''],
    commissioningDate: [''],
    nextMaintenanceDate: [''],
    expectedLifespanYears: ['', Validators.min(0)],
    assetSpecs: this.fb.group({})
  });

  readonly maintenanceForm = this.fb.group({
    maintenanceType: ['preventive', Validators.required],
    maintenanceDate: [this.toDateInputValue(new Date()), Validators.required],
    status: ['completed', Validators.required],
    cost: ['', Validators.min(0)],
    remarks: ['', Validators.required],
    nextMaintenanceDate: [''],
  });

  readonly assetInsightOpen = signal(false);
  readonly assetInsightData = computed<AssetInsightSnapshot | null>(() => {
    if (!this.assetInsightOpen()) {
      return null;
    }
    return this.buildAssetInsight(this.selectedPlan());
  });
  readonly assetInsightMapPlans = computed<MapWorkspacePlan[]>(() => {
    if (!this.assetInsightOpen()) {
      return [];
    }
    const plan = this.selectedPlan();
    if (!plan) {
      return [];
    }
    const attributes = plan.attributes ?? {};
    return [
      {
        id: plan.id,
        title: plan.title,
        category: plan.category,
        commissioningDate: plan.commissioningDate ?? attributes['commissioningDate'] ?? null,
        nextMaintenanceDate: plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(attributes) ?? null,
        expectedLifespanYears: plan.expectedLifespanYears ?? attributes['expectedLifespanYears'] ?? null,
        operationalData: plan.operationalData ?? this.normaliseOperationalData(attributes['operationalData'] ?? null),
        feature: plan.feature,
        attributes,
      },
    ];
  });

  private readonly assetDefinitionIndex = new Map<string, AssetDefinition>();
  private readonly siteIndex = new Map<string, SiteOption>();
  private subscriptions: Subscription[] = [];
  private titleManualOverride = false;
  private activeAssetConfig: AssetFormConfig | null = null;

  readonly activeAssetFields = signal<AssetFieldConfig[]>([]);
  readonly activeAssetFormMeta = signal<{ title: string; summary: string } | null>(null);
  readonly activeRecurringFields = signal<AssetFieldConfig[]>([]);
  readonly activeRecurringMeta = signal<{ title: string; summary: string } | null>(null);
  readonly currentAssetType = signal<string>('');

  readonly recurringHistoryColumns = computed<Array<{ key: string; label: string }>>(() => {
    const fields = this.activeRecurringFields();
    if (!fields.length) {
      return [];
    }
    const seen = new Set<string>();
    const columns: Array<{ key: string; label: string }> = [];
    fields.forEach(field => {
      if (!field.attributeKey || field.role === 'section') {
        return;
      }
      if (seen.has(field.attributeKey)) {
        return;
      }
      seen.add(field.attributeKey);
      columns.push({
        key: field.attributeKey,
        label: field.unit ? `${field.label} (${field.unit})` : field.label
      });
    });
    return columns;
  });

  readonly recurringHistoryEntries = computed<OhrRecurringHistoryEntry[]>(() => {
    const assetType = this.currentAssetType();
    if (assetType !== 'overhead-reservoir') {
      return [];
    }
    const plan = this.selectedPlan();
    if (!plan) {
      return [];
    }
    const rawHistory = plan.ohrRecurringHistory ?? plan.attributes?.['ohrRecurringHistory'];
    const normalised = this.normaliseOhrRecurringHistory(rawHistory);
    if (!normalised.length) {
      return [];
    }
    const allowedKeys = new Set(this.recurringHistoryColumns().map(column => column.key));
    const filtered = normalised.map(entry => ({
      capturedAt: entry.capturedAt,
      values: Object.fromEntries(
        Object.entries(entry.values).filter(([key]) => !allowedKeys.size || allowedKeys.has(key))
      )
    }));
    return filtered.reverse();
  });

  // Asset Layer Signals
  readonly assetLayerCollapsed = signal(false);
  readonly mapRef = signal<any>(null);

  // Maintenance Module State
  readonly maintenanceModuleOpen = signal(false);
  readonly maintenanceSelectedPlan = signal<ConsultantPlan | null>(null);
  readonly maintenanceError = signal('');
  readonly maintenanceSaving = signal(false);
  readonly maintenanceFiles = signal<File[]>([]);
  private readonly superAdminAccess = signal(false);

  // Recurring measurement attachment state
  readonly recurringAttachmentFile = signal<File | null>(null);

  private get assetSpecsGroup(): FormGroup {
    return this.planForm.get('assetSpecs') as FormGroup;
  }

  private readonly assetFormLibrary: AssetFormConfig[] = [
    {
      assetTypes: ['water-pipeline'],
      geometry: 'line',
      title: 'Pipeline hydraulics',
      summary: 'Capture key pipeline design parameters to support hydraulic modelling and maintenance.',
      fields: [
        { control: 'pipeMaterial', label: 'Pipe Material', attributeKey: 'pipeMaterial', aliases: ['material'], placeholder: 'e.g. Ductile Iron / HDPE', required: true },
        { control: 'pipeDiameter', label: 'Nominal Diameter (mm)', attributeKey: 'pipeDiameter', aliases: ['dimension', 'diameter'], type: 'number', placeholder: 'e.g. 200', unit: 'mm', required: true },
        { control: 'pipeLength', label: 'Design Length (m)', attributeKey: 'lengthMeters', aliases: ['length'], type: 'number', placeholder: 'e.g. 350', unit: 'm' },
        { control: 'pressureClass', label: 'Pressure Class / Rating', attributeKey: 'pressureClass', placeholder: 'e.g. PN 16' },
        { control: 'burialDepth', label: 'Minimum Cover Depth (m)', attributeKey: 'coverDepth', type: 'number', placeholder: 'e.g. 1.2', unit: 'm' },
        { control: 'designFlow', label: 'Design Flow (L/s)', attributeKey: 'designFlow', type: 'number', placeholder: 'e.g. 15', unit: 'L/s' }
      ]
    },
    {
      assetTypes: ['sewage-line'],
      geometry: 'line',
      title: 'Sewer conveyance details',
      summary: 'Record pipe sizing and grade to evaluate sanitary sewer performance.',
      fields: [
        { control: 'pipeMaterial', label: 'Pipe Material', attributeKey: 'pipeMaterial', aliases: ['material'], placeholder: 'e.g. uPVC / RCC', required: true },
        { control: 'pipeDiameter', label: 'Internal Diameter (mm)', attributeKey: 'pipeDiameter', aliases: ['dimension', 'diameter'], type: 'number', placeholder: 'e.g. 300', unit: 'mm', required: true },
        { control: 'pipeLength', label: 'Segment Length (m)', attributeKey: 'lengthMeters', aliases: ['length'], type: 'number', placeholder: 'e.g. 120', unit: 'm' },
        { control: 'invertStart', label: 'Upstream Invert Level (m)', attributeKey: 'invertLevelStart', type: 'number', placeholder: 'e.g. 188.45', unit: 'mRL' },
        { control: 'invertEnd', label: 'Downstream Invert Level (m)', attributeKey: 'invertLevelEnd', type: 'number', placeholder: 'e.g. 187.85', unit: 'mRL' },
        { control: 'slope', label: 'Pipe Slope (%)', attributeKey: 'slopePercent', type: 'number', placeholder: 'e.g. 0.5', unit: '%' }
      ]
    },
    {
      assetTypes: ['overhead-reservoir'],
      geometry: 'area',
      title: 'Elevated storage configuration',
      summary: 'Document staging and storage to confirm service coverage and fire flow resilience.',
      fields: [
        { control: 'sectionBasicInfo', label: 'A. Basic Village Information', role: 'section', description: 'Static context captured once for the served settlement.' },
        { control: 'villageTehsil', label: 'Tehsil Name', attributeKey: 'ohrTehsilName', placeholder: 'e.g. Vehari', frequencyLabel: 'One-time' },
        { control: 'villageName', label: 'Village Name', attributeKey: 'ohrVillageName', placeholder: 'e.g. 95/WB', frequencyLabel: 'One-time' },
        { control: 'settlementName', label: 'Settlement / Mohallah', attributeKey: 'ohrSettlementName', placeholder: 'Optional', frequencyLabel: 'One-time' },
        { control: 'villagePopulation', label: 'Village Population', attributeKey: 'ohrVillagePopulation', type: 'number', placeholder: 'e.g. 3200', frequencyLabel: 'One-time' },

        { control: 'sectionOperationalStart', label: 'B. Operational Start & Energy Connectivity', role: 'section', description: 'Commissioning milestones for the scheme.' },
        { control: 'operationsStartDate', label: 'Operations Start Date', attributeKey: 'ohrOperationsStartDate', type: 'date', frequencyLabel: 'One-time' },
        { control: 'gridConnectionDate', label: 'Grid Connection Date', attributeKey: 'ohrGridConnectionDate', type: 'date', frequencyLabel: 'One-time' },
        { control: 'solarGenerationDate', label: 'Solar Generation Date', attributeKey: 'ohrSolarGenerationDate', type: 'date', frequencyLabel: 'One-time' },

        { control: 'sectionGreenMeter', label: 'C. Green Meter Details', role: 'section', description: 'Metering inventory maintained jointly with WAPDA.' },
        { control: 'greenMeterSerialNumber', label: 'Green Meter Serial Number', attributeKey: 'greenMeterSerialNumber', placeholder: 'e.g. GM-12345', frequencyLabel: 'One-time' },
        { control: 'greenMeterInstallDate', label: 'Green Meter Installation Date', attributeKey: 'greenMeterInstallationDate', type: 'date', frequencyLabel: 'One-time' },
        { control: 'greenMeterType', label: 'Meter Type / Brand / Class', attributeKey: 'greenMeterType', placeholder: 'e.g. EMCO Class 1.0', frequencyLabel: 'One-time' },
        { control: 'greenMeterModuleSerial', label: 'Communication Module Serial #', attributeKey: 'greenMeterModuleSerialNumber', placeholder: 'Optional', frequencyLabel: 'One-time' },
        { control: 'greenMeterCalibration', label: 'Calibration Certificate / Frequency', attributeKey: 'greenMeterCalibration', placeholder: 'e.g. PTB – Annual', frequencyLabel: 'One-time' },
        { control: 'greenMeterBillAttachment', label: 'WAPDA Bill Reference (URL or ID)', attributeKey: 'greenMeterBillAttachment', placeholder: 'Upload link or reference number', frequencyLabel: 'Monthly' },

        { control: 'sectionPumpInfra', label: 'D. Pump & Water Supply Infrastructure', role: 'section', description: 'Mechanical and hydraulic parameters for the booster arrangement.' },
        { control: 'pumpCapacityKwh', label: 'Pump Capacity (kWh)', attributeKey: 'pumpCapacityKwh', type: 'number', placeholder: 'e.g. 18', unit: 'kWh', frequencyLabel: 'One-time' },
        { control: 'pumpCapacityFlow', label: 'Pump Capacity (m³/hr)', attributeKey: 'pumpCapacityFlow', type: 'number', placeholder: 'e.g. 45', unit: 'm³/hr', frequencyLabel: 'One-time' },
        { control: 'pumpType', label: 'Pump Type', attributeKey: 'pumpType', type: 'select', options: [
          { label: 'Select pump type', value: '' },
          { label: 'Submersible', value: 'submersible' },
          { label: 'Centrifugal', value: 'centrifugal' },
          { label: 'Vertical Turbine', value: 'vertical-turbine' },
          { label: 'Other', value: 'other' }
        ], frequencyLabel: 'One-time' },
        { control: 'pumpMake', label: 'Pump Make', attributeKey: 'pumpMake', placeholder: 'e.g. KSB', frequencyLabel: 'One-time' },
        { control: 'pumpPower', label: 'Pump Power (kW)', attributeKey: 'pumpPowerKw', type: 'number', placeholder: 'e.g. 22', unit: 'kW', frequencyLabel: 'One-time' },
        { control: 'storageVolume', label: 'OHR Effective Volume (m³)', attributeKey: 'storageVolume', aliases: ['capacity'], type: 'number', placeholder: 'e.g. 450', unit: 'm³', required: true, frequencyLabel: 'One-time' },
        { control: 'stagingHeight', label: 'Staging Height (m)', attributeKey: 'stagingHeight', type: 'number', placeholder: 'e.g. 35', unit: 'm', required: true, frequencyLabel: 'One-time' },
        { control: 'tankType', label: 'Tank Type', attributeKey: 'tankType', placeholder: 'e.g. Intze / Spheroid', frequencyLabel: 'One-time' },
        { control: 'foundation', label: 'Foundation / Base', attributeKey: 'foundationType', placeholder: 'e.g. Raft with pile cap', frequencyLabel: 'One-time' },
        { control: 'ohrOperatingHours', label: 'OHR Pump Operating Hours (Daily)', attributeKey: 'ohrPumpOperatingHours', type: 'number', placeholder: 'e.g. 6', unit: 'hours', frequencyLabel: 'Daily' },
        { control: 'ohrFillTime', label: 'Time to Fill OHR Without Outflow', attributeKey: 'ohrFillTimeNoOutflow', type: 'number', placeholder: 'e.g. 2.5', unit: 'hours', frequencyLabel: 'Monthly' },
        { control: 'installationDischarge', label: 'Installation Discharge (m³)', attributeKey: 'installationDischargeM3', type: 'number', placeholder: 'e.g. 180', unit: 'm³', frequencyLabel: 'One-time' },

        { control: 'sectionBulkMeter', label: 'E. Bulk Meter Details', role: 'section', description: 'Production metering tied to reservoir discharge.' },
        { control: 'bulkMeterInstallationDate', label: 'Bulk Meter Installation Date', attributeKey: 'bulkMeterInstallationDate', type: 'date', frequencyLabel: 'One-time' },
        { control: 'bulkMeterType', label: 'Bulk Meter Type / Brand', attributeKey: 'bulkMeterType', placeholder: 'e.g. ABB Magnetic', frequencyLabel: 'One-time' },
        { control: 'bulkMeterReadingDaily', label: 'Bulk Meter Reading', attributeKey: 'bulkMeterReadingDaily', type: 'number', placeholder: 'Gallons per day', unit: 'gal', frequencyLabel: 'Daily', description: 'Today’s reading – previous reading = total production' },

        { control: 'sectionSolarSystem', label: 'F. Solar System Details', role: 'section', description: 'Solar augmentation that offsets grid consumption.' },
        { control: 'solarSystemCapacity', label: 'Solar System Capacity (kWp)', attributeKey: 'solarSystemCapacity', type: 'number', placeholder: 'e.g. 15', unit: 'kWp', frequencyLabel: 'One-time', description: 'Number of plates × watt per plate' },
        { control: 'inverterCapacity', label: 'Inverter Capacity (kVA)', attributeKey: 'inverterCapacity', type: 'number', placeholder: 'e.g. 12', unit: 'kVA', frequencyLabel: 'One-time' },
        { control: 'inverterUnitsProduced', label: 'Units Produced by Inverter', attributeKey: 'inverterUnitsProduced', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'inverterUnitsExported', label: 'Units Exported to WAPDA', attributeKey: 'inverterUnitsExported', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'vfdCapacity', label: 'VFD Capacity (kW)', attributeKey: 'vfdCapacity', type: 'number', placeholder: 'e.g. 7.5', unit: 'kW', frequencyLabel: 'One-time' },
        { control: 'vfdHoursWithoutWapda', label: 'Hours on VFD Without WAPDA', attributeKey: 'vfdHoursWithoutWapda', type: 'number', placeholder: 'Daily hours', unit: 'hours', frequencyLabel: 'Daily' },

        { control: 'sectionSubMetering', label: 'G. Sub-Metering', role: 'section', description: 'Electrical sub-metering for VFD-fed assets.' },
        { control: 'electricSubMeterInstalled', label: 'Electric Sub Meter Installed', attributeKey: 'electricSubMeterInstalled', type: 'select', options: [
          { label: 'Select option', value: '' },
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' }
        ], frequencyLabel: 'One-time' },
        { control: 'electricSubMeterInstallationDate', label: 'Sub Meter Installation Date', attributeKey: 'electricSubMeterInstallationDate', type: 'date', frequencyLabel: 'One-time' },

        { control: 'sectionGridImportExport', label: 'H. Grid Import / Export Data', role: 'section', description: 'Monthly reconciliation of energy flows at green meter.' },
        { control: 'greenMeterReadingPeak', label: 'Green Meter Reading (Peak)', attributeKey: 'greenMeterReadingPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'greenMeterReadingOffPeak', label: 'Green Meter Reading (Off-Peak)', attributeKey: 'greenMeterReadingOffPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'unitsExportedPeak', label: 'Units Exported to WAPDA (Peak)', attributeKey: 'unitsExportedPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'unitsExportedOffPeak', label: 'Units Exported to WAPDA (Off-Peak)', attributeKey: 'unitsExportedOffPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'unitsImportedPeak', label: 'Units Imported from WAPDA (Peak)', attributeKey: 'unitsImportedPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' },
        { control: 'unitsImportedOffPeak', label: 'Units Imported from WAPDA (Off-Peak)', attributeKey: 'unitsImportedOffPeak', type: 'number', placeholder: 'Monthly kWh', unit: 'kWh', frequencyLabel: 'Monthly' }
      ]
    },
    {
      assetTypes: ['stand-post'],
      geometry: 'point',
      title: 'Public stand post service',
      summary: 'Capture service level for communal distribution to evaluate equitable supply.',
      fields: [
        { control: 'numberOfTaps', label: 'Number of Taps', attributeKey: 'taps', type: 'number', placeholder: 'e.g. 4' },
        { control: 'servedPopulation', label: 'Population Served', attributeKey: 'servedPopulation', type: 'number', placeholder: 'e.g. 120 households' },
        { control: 'operatingHours', label: 'Operating Hours / Day', attributeKey: 'operatingHours', type: 'number', placeholder: 'e.g. 12', unit: 'h' },
        { control: 'flowPerTap', label: 'Estimated Flow per Tap (L/min)', attributeKey: 'tapFlowRate', type: 'number', placeholder: 'e.g. 10', unit: 'L/min' }
      ]
    },
    {
      assetTypes: ['ro-plant'],
      geometry: 'area',
      title: 'RO treatment design',
      summary: 'Track treatment performance indicators for the reverse osmosis unit.',
      fields: [
        { control: 'plantCapacity', label: 'Permeate Capacity (m³/day)', attributeKey: 'permeateCapacity', aliases: ['capacity'], type: 'number', placeholder: 'e.g. 75', unit: 'm³/day', required: true },
        { control: 'feedTds', label: 'Feed Water TDS (mg/L)', attributeKey: 'feedTds', type: 'number', placeholder: 'e.g. 1500', unit: 'mg/L' },
        { control: 'recoveryRate', label: 'Recovery Rate (%)', attributeKey: 'recoveryPercent', type: 'number', placeholder: 'e.g. 65', unit: '%' },
        { control: 'preTreatment', label: 'Pre-treatment Summary', attributeKey: 'preTreatment', placeholder: 'e.g. Sand + Carbon filtration' }
      ]
    },
    {
      assetTypes: ['bore-hole'],
      geometry: 'point',
      title: 'Borehole construction log',
      summary: 'Store borehole drilling details for long-term groundwater stewardship.',
      fields: [
        { control: 'drillDepth', label: 'Drilled Depth (m bgl)', attributeKey: 'drilledDepth', type: 'number', placeholder: 'e.g. 120', unit: 'm', required: true },
        { control: 'casingDiameter', label: 'Casing Diameter (mm)', attributeKey: 'casingDiameter', type: 'number', placeholder: 'e.g. 200', unit: 'mm' },
        { control: 'staticWaterLevel', label: 'Static Water Level (m bgl)', attributeKey: 'staticWaterLevel', type: 'number', placeholder: 'e.g. 18', unit: 'm' },
        { control: 'pumpCapacity', label: 'Pump Capacity (L/min)', attributeKey: 'pumpCapacity', type: 'number', placeholder: 'e.g. 180', unit: 'L/min' },
        { control: 'testedYield', label: 'Tested Yield (m³/hr)', attributeKey: 'testedYield', type: 'number', placeholder: 'e.g. 12', unit: 'm³/hr' },
        { control: 'waterQualityNotes', label: 'Water Quality Notes', attributeKey: 'waterQualityNotes', placeholder: 'e.g. Iron 0.4 mg/L' }
      ]
    },
    {
      assetTypes: ['manhole'],
      geometry: 'point',
      title: 'Manhole specification',
      summary: 'Capture chamber sizing for inspection and maintenance planning.',
      fields: [
        { control: 'internalDiameter', label: 'Internal Diameter (mm)', attributeKey: 'internalDiameter', type: 'number', placeholder: 'e.g. 1200', unit: 'mm', required: true },
        { control: 'benchingType', label: 'Bench Construction', attributeKey: 'benchingType', placeholder: 'e.g. Cement mortar' },
        { control: 'coverLevel', label: 'Cover Level (mRL)', attributeKey: 'coverLevel', type: 'number', placeholder: 'e.g. 190.15', unit: 'mRL' },
        { control: 'depth', label: 'Chamber Depth (m)', attributeKey: 'depth', type: 'number', placeholder: 'e.g. 4.2', unit: 'm' }
      ]
    },
    {
      assetTypes: ['solar-installation'],
      geometry: 'area',
      title: 'Solar system sizing',
      summary: 'Record photovoltaic array data to manage energy availability for remote assets.',
      fields: [
        { control: 'arrayCapacity', label: 'Array Capacity (kWp)', attributeKey: 'solarCapacity', aliases: ['capacity'], type: 'number', placeholder: 'e.g. 12', unit: 'kWp' },
        { control: 'panelType', label: 'Panel Type', attributeKey: 'panelType', placeholder: 'e.g. Mono-crystalline' },
        { control: 'storageCapacity', label: 'Battery Storage (kWh)', attributeKey: 'storageCapacity', type: 'number', placeholder: 'e.g. 30', unit: 'kWh' },
        { control: 'inverterRating', label: 'Inverter Rating (kVA)', attributeKey: 'inverterRating', type: 'number', placeholder: 'e.g. 10', unit: 'kVA' }
      ]
    },
    {
      assetTypes: ['guard-room', 'tubewell-pump-room', 'water-support-asset', 'other-sewerage-asset'],
      geometry: 'area',
      title: 'General infrastructure details',
      summary: 'Use flexible descriptors to track dimensions and utilities for ancillary facilities.',
      fields: [
        { control: 'footprintArea', label: 'Footprint Area (m²)', attributeKey: 'footprintArea', type: 'number', placeholder: 'e.g. 48', unit: 'm²' },
        { control: 'structureType', label: 'Structure Type', attributeKey: 'structureType', placeholder: 'e.g. Brick load-bearing' },
        { control: 'utilities', label: 'Utilities Provision', attributeKey: 'utilities', placeholder: 'e.g. 3-phase power, water tap' },
        { control: 'powerSource', label: 'Power Source', attributeKey: 'powerSource', placeholder: 'e.g. Solar hybrid' },
        { control: 'securityNotes', label: 'Security / Access Notes', attributeKey: 'securityNotes', placeholder: 'e.g. Requires guard shift 24/7' }
      ]
    },
    {
      assetTypes: ['abr'],
      geometry: 'area',
      title: 'ABR configuration',
      summary: 'Capture pump and discharge information required for ABR operations.',
      fields: [
        { control: 'footprintArea', label: 'Footprint Area (m²)', attributeKey: 'footprintArea', type: 'number', placeholder: 'e.g. 48', unit: 'm²' },
        { control: 'structureType', label: 'Structure Type', attributeKey: 'structureType', placeholder: 'e.g. RCC chamber' },
        { control: 'utilities', label: 'Utilities Provision', attributeKey: 'utilities', placeholder: 'e.g. 3-phase power, water tap' },
        { control: 'pumpMake', label: 'Pump Make', attributeKey: 'pumpMake', placeholder: 'e.g. KSB' },
        { control: 'pumpPower', label: 'Pump Power (kW)', attributeKey: 'pumpPowerKw', type: 'number', placeholder: 'e.g. 15', unit: 'kW' },
        { control: 'installDischarge', label: 'Installation Date Discharge (m³)', attributeKey: 'installationDischargeM3', type: 'number', placeholder: 'e.g. 120', unit: 'm³' }
      ]
    },
    {
      assetTypes: ['custom-asset'],
      geometry: 'point',
      title: 'Custom asset details',
      summary: 'Describe bespoke infrastructure by storing key attributes alongside the mapped location.',
      fields: [
        { control: 'assetPurpose', label: 'Asset Purpose', attributeKey: 'assetPurpose', placeholder: 'e.g. Booster pump, check valve' },
        { control: 'designCapacity', label: 'Design Capacity', attributeKey: 'designCapacity', placeholder: 'e.g. 30 m³/hr' },
        { control: 'operationalNotes', label: 'Operational Notes', attributeKey: 'operationalNotes', placeholder: 'e.g. Run hours limited to 6 hrs/day' }
      ]
    }
  ];

  constructor() {
    effect(() => {
      const definitions = this.assetDefinitions();
      this.rebuildDefinitionIndex(definitions);
    });

    effect(() => {
      const plan = this.selectedPlan();
      const draft = this.draftFeature();
      this.updateDraftSummary(plan, draft);
    });
  }

  ngOnInit(): void {
    this.bootstrapCurrentUserRole();
    this.bindFormListeners();
    this.loadDefinitions();
    this.loadPlans();
    this.loadEligibleSites();
    this.syncVisibleCategories();
    this.initializeAssetLayers();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  trackByPlan(_: number, plan: ConsultantPlan): string {
    return plan?.id || _?.toString();
  }

  assetDisplay(def: AssetDefinition | null | undefined): string {
    if (!def) {
      return '';
    }
    return `${def.label}`;
  }

  attributeEntries(plan: ConsultantPlan | null): Array<{ key: string; label: string; value: unknown }> {
    if (!plan || !plan.attributes) {
      return [];
    }
    const config = this.resolveAssetForm(plan.assetType);
    const labelLookup = new Map<string, string>();
    config?.fields.forEach(field => {
      if (field.attributeKey) {
        labelLookup.set(field.attributeKey, field.label);
      }
    });
    const standardLabels = new Map<string, string>([
      ['notes', 'Field notes']
    ]);
    return Object.entries(plan.attributes)
      .filter(([key]) => key !== 'operationalData' && key !== 'operationalSnapshotHistory' && key !== 'ohrRecurringHistory')
      .map(([key, value]) => ({
        key,
        label: labelLookup.get(key) || standardLabels.get(key) || this.humaniseAttributeKey(key),
        value
      }));
  }

  startNewPlan(): void {
    this.selectedPlan.set(null);
    this.closeAssetInsights();
    this.titleManualOverride = false;
    this.planForm.reset({
      assetType: '',
      category: '',
      title: '',
      requisitionId: '',
      tehsil: '',
      district: '',
      description: '',
      notes: '',
      attributesJson: '',
      commissioningDate: '',
      nextMaintenanceDate: '',
      expectedLifespanYears: ''
    });
    this.assetSpecsGroup.reset({});
    this.activeAssetFields.set([]);
    this.activeAssetConfig = null;
    this.activeAssetFormMeta.set(null);
    this.activeRecurringFields.set([]);
    this.activeRecurringMeta.set(null);
    this.currentAssetType.set('');
    this.unlockAllAssetSpecControls();
    this.planForm.markAsPristine();
    this.clearDraft();
    this.updateDraftSummary();
  }

  onSelectPlan(plan: ConsultantPlan, keepMapFocus = false): void {
    if (!plan) {
      return;
    }
    this.selectedPlan.set(plan);
    this.titleManualOverride = true;
    const attributes = plan.attributes || {};
    const normalisedRecurringHistory = this.normaliseOhrRecurringHistory(attributes['ohrRecurringHistory']);
    if (normalisedRecurringHistory.length) {
      attributes['ohrRecurringHistory'] = normalisedRecurringHistory;
      plan.ohrRecurringHistory = normalisedRecurringHistory;
    } else {
      delete attributes['ohrRecurringHistory'];
      plan.ohrRecurringHistory = [];
    }
    const commissioningDateInput = this.toDateInputValue(plan.commissioningDate ?? attributes['commissioningDate']);
    const nextMaintenanceDateInput = this.toDateInputValue(
      plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(attributes),
    );
    const expectedLifespanInput = this.toNumberInputValue(
      plan.expectedLifespanYears ?? attributes['expectedLifespanYears'],
    );
    this.planForm.patchValue({
      assetType: plan.assetType,
      category: plan.category,
      title: plan.title,
      requisitionId: plan.requisitionId || '',
      tehsil: plan.tehsil,
      district: plan.district,
      description: plan.description,
      notes: attributes['notes'] || '',
      attributesJson: this.serialiseAttributes(attributes),
      commissioningDate: commissioningDateInput,
      nextMaintenanceDate: nextMaintenanceDateInput,
      expectedLifespanYears: expectedLifespanInput
    });
    this.activateAssetForm(plan.assetType, false);
    this.patchAssetSpecsFromAttributes(attributes);
    this.planForm.markAsPristine();
    this.updateDraftSummary();
    if (!keepMapFocus) {
      this.mapWorkspace?.focusOnPlan(plan.id);
    }
    this.openAssetInsights(plan);
  }

  clearDraft(): void {
    this.draftFeature.set(null);
    this.mapWorkspace?.clearDraft();
    this.updateDraftSummary();
  }

  startPipelineDrawing(): void {
    const summary = 'Drawing pipeline: click along the alignment and double-click to finish.';
    this.mapWorkspace?.beginDrawing('polyline', { summary });
    this.draftSummary.set(summary);
  }

  startPinDrawing(): void {
    const summary = 'Dropping point asset: click the map to place the location.';
    this.mapWorkspace?.beginDrawing('marker', { summary });
    this.draftSummary.set(summary);
  }

  startAreaDrawing(): void {
    const summary = 'Outlining area asset: click each corner and finish on the starting point.';
    this.mapWorkspace?.beginDrawing('polygon', { summary });
    this.draftSummary.set(summary);
  }

  onDraftFeatureChange(feature: Feature | null): void {
    this.draftFeature.set(feature ? cloneFeature(feature) : null);
    this.planForm.markAsDirty();
    this.formError.set('');
    this.updateDraftSummary();
  }

  onDraftSummaryChange(summary: string): void {
    this.draftSummary.set(summary);
  }

  onMapPlanFocused(planId: string | null): void {
    if (!planId) {
      return;
    }
    const plan = this.planList().find(item => item.id === planId);
    if (plan) {
      this.onSelectPlan(plan, true);
    }
  }

  onFilterCategoryChange(value: string): void {
    this.filterCategory.set(value);
    if (value) {
      const currentAsset = this.filterAssetType();
      const matchesCategory = this.assetDefinitions().some(def => def.value === currentAsset && def.category.toLowerCase() === value.toLowerCase());
      if (!matchesCategory) {
        this.filterAssetType.set('');
      }
    }
  }

  onFilterAssetTypeChange(value: string): void {
    this.filterAssetType.set(value);
  }

  onFilterRequisitionChange(value: string): void {
    this.filterRequisition.set(value);
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value || '');
  }

  onTitleInput(): void {
    this.titleManualOverride = true;
  }

  onRecurringAttachmentChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.recurringAttachmentFile.set(file);
  }

  clearRecurringAttachment(): void {
    this.recurringAttachmentFile.set(null);
  }

  onSubmit(): void {
    if (this.planForm.invalid) {
      this.planForm.markAllAsTouched();
      this.formError.set('Fill in the required fields before saving the plan.');
      return;
    }

    const activeFeature = this.getActiveFeature();
    if (!activeFeature) {
      this.formError.set('Draw the infrastructure geometry on the map before saving.');
      return;
    }

    const raw = this.planForm.getRawValue();
    const assetDef = this.resolveAsset(raw['assetType']);
    if (!assetDef) {
      this.formError.set('Select a supported asset type.');
      return;
    }
    const recurringFile = this.recurringAttachmentFile();
    const shouldUploadRecurringAttachment = assetDef.value === 'overhead-reservoir' && !!recurringFile;
    const upload$ = shouldUploadRecurringAttachment
      ? this.plansService.uploadAttachments([recurringFile!])
      : of<ConsultantPlanAttachment[]>([]);

    this.formError.set('');
    this.saving.set(true);

    const existing = this.selectedPlan();

    upload$
      .pipe(
        switchMap(attachments => {
          const recurringAttachment = attachments[0] ?? null;
          const attributes = this.buildAttributes(raw, recurringAttachment);
          if (attributes === null) {
            return throwError(() => new Error('INVALID_ATTRIBUTES'));
          }

          const layerName = this.deriveLayerName(activeFeature, assetDef);
          const decoratedFeature = this.decorateFeature(activeFeature, raw, assetDef, layerName);

          // Ensure the feature is a plain object (not an Angular Signal or other wrapper)
          const cleanFeature = {
            type: 'Feature',
            geometry: {
              type: decoratedFeature.geometry?.type,
              coordinates: (decoratedFeature.geometry as any)?.coordinates || []
            },
            properties: decoratedFeature.properties ? { ...decoratedFeature.properties } : {}
          };

          const commissioningDate = raw['commissioningDate'] ? String(raw['commissioningDate']).trim() || null : null;
          const nextMaintenanceDate = raw['nextMaintenanceDate'] ? String(raw['nextMaintenanceDate']).trim() || null : null;
          const expectedLifespanYears = this.normaliseExpectedLifespanInput(raw['expectedLifespanYears']);

          const payload: any = {
            assetType: assetDef.value,
            title: raw['title'],
            description: raw['description'],
            requisitionId: raw['requisitionId'] || null,
            tehsil: raw['tehsil'],
            district: raw['district'],
            attributes,
            coordinates: this.currentCoordinates(),
            layerName,
            feature: cleanFeature,
            commissioningDate,
            nextMaintenanceDate,
            expectedLifespanYears
          };

          // Debug log for troubleshooting
          console.log('Payload being sent:', payload);
          console.log('Payload attributes:', attributes);
          console.log('Current coordinates:', this.currentCoordinates());
          console.log('Feature geometry:', cleanFeature.geometry);

          return existing
            ? this.plansService.updatePlan(existing.id, payload)
            : this.plansService.createPlan(payload);
        }),
        catchError(err => {
          console.error('Save error details:', err);
          const message = err?.message === 'INVALID_ATTRIBUTES'
            ? 'Asset attributes JSON is invalid.'
            : err?.error?.msg || err?.error?.error || err?.message || 'Unable to save plan.';
          this.formError.set(message);
          this.notificationService.push(message, { type: 'critical' });
          return of(null);
        }),
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe(response => {
        if (!response) {
          return;
        }
        const normalised = this.normalisePlan(response);
        if (!normalised) {
          this.notificationService.push('Plan saved, but rendering failed. Refresh to sync data.', { type: 'warning' });
          return;
        }
        const updated = this.mergePlanIntoList(normalised);
        this.planList.set(updated);
        this.selectedPlan.set(normalised);
        this.titleManualOverride = true;
        this.patchAssetSpecsFromAttributes(normalised.attributes ?? {});
        this.planForm.markAsPristine();
        this.clearDraft();
        this.recurringAttachmentFile.set(null);
        this.notificationService.push(existing ? 'Plan updated successfully.' : 'New plan captured successfully.', {
          type: 'success'
        });
      });
  }

  deletePlan(plan: ConsultantPlan, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (!plan) {
      return;
    }
    const confirmed = confirm(`Remove "${plan.title}" from the consultant plans?`);
    if (!confirmed) {
      return;
    }
    this.saving.set(true);
    this.plansService.deletePlan(plan.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.planList.set(this.planList().filter(item => item.id !== plan.id));
        this.refreshMaintenanceSelection();
        if (this.selectedPlan()?.id === plan.id) {
          this.startNewPlan();
        }
        this.notificationService.push('Plan removed successfully.', { type: 'success' });
      },
      error: err => {
        this.saving.set(false);
        const message = err?.error?.msg || err?.message || 'Unable to delete plan.';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  clearFilters(): void {
    this.filterCategory.set('');
    this.filterAssetType.set('');
    this.filterRequisition.set('');
    this.searchTerm.set('');
  }

  exportAssetReport(): void {
    const plans = [...this.planList()];
    this.exportPlansAsCsv(plans, 'asset-report', 'Asset report prepared for download.');
  }

  exportSelectedAssetReport(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      this.notificationService.push('Select an asset to export its report.', { type: 'warning' });
      return;
    }
    const slug = this.buildAssetExportSlug(plan);
    this.exportPlansAsCsv([plan], `asset-${slug}`, 'Selected asset report prepared for download.');
  }

  private buildAssetExportSlug(plan: ConsultantPlan): string {
    const base = plan.title || plan.assetLabel || plan.assetType || plan.id || 'asset';
    const slug = slugKey(base);
    return slug || (plan.id || 'asset');
  }

  private exportPlansAsCsv(plans: ConsultantPlan[], fileSlug: string, successMessage: string): void {
    if (!plans.length) {
      this.notificationService.push('No assets available to export.', { type: 'warning' });
      return;
    }
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      this.notificationService.push('Excel export is only available in a browser session.', { type: 'warning' });
      return;
    }
    try {
      const attributeKeys = this.collectExportAttributeKeys(plans);
      const attributeLabels = attributeKeys.map(key => this.humaniseAttributeKey(key) || key);
      const recurringValueKeys = this.collectRecurringValueKeys(plans);
      const maxOperationalHistoryLength = this.maxOperationalHistoryLength(plans);
      const maxRecurringHistoryLength = this.maxRecurringHistoryLength(plans);

      const baseHeaders = [
        'Asset ID',
        'Title',
        'Asset Label',
        'Asset Type',
        'Category',
        'Requisition ID',
        'Tehsil',
        'District',
        'Coordinates (lat, lng)',
        'Commissioning Date',
        'Next Maintenance Date',
        'Expected Lifespan (years)',
        'Created At',
        'Updated At'
      ];

      const snapshotHeaders = OPERATIONAL_SNAPSHOT_KEYS.map(key => {
        const label = this.humaniseAttributeKey(key) || key;
        return `Operational Snapshot: ${label}`;
      });

      const operationalHistoryHeaders: string[] = [];
      for (let index = 0; index < maxOperationalHistoryLength; index += 1) {
        const prefix = `Operational History #${index + 1}`;
        operationalHistoryHeaders.push(`${prefix} Captured At`);
        OPERATIONAL_SNAPSHOT_KEYS.forEach(key => {
          const label = this.humaniseAttributeKey(key) || key;
          operationalHistoryHeaders.push(`${prefix} ${label}`);
        });
      }

      const recurringHistoryHeaders: string[] = [];
      for (let index = 0; index < maxRecurringHistoryLength; index += 1) {
        const prefix = `OHR Recurring History #${index + 1}`;
        recurringHistoryHeaders.push(`${prefix} Captured At`);
        recurringValueKeys.forEach(key => {
          const label = this.humaniseAttributeKey(key) || key;
          recurringHistoryHeaders.push(`${prefix} ${label}`);
        });
      }

      const headerRow = [
        ...baseHeaders,
        ...snapshotHeaders,
        ...operationalHistoryHeaders,
        ...recurringHistoryHeaders,
        ...attributeLabels
      ]
        .map(label => this.escapeForCsv(label))
        .join(',');

      const lines = plans.map(plan => {
        const attributes = plan.attributes ?? {};
        const coordinates = plan.coordinates ?? this.extractPointCoordinates(plan.feature);
        const coordinateLabel = coordinates ? `${coordinates.lat.toFixed(6)}, ${coordinates.lng.toFixed(6)}` : '';
        const baseValuesSource: unknown[] = [
          plan.id,
          plan.title,
          plan.assetLabel,
          plan.assetType,
          plan.category,
          plan.requisitionId,
          plan.tehsil,
          plan.district,
          coordinateLabel,
          plan.commissioningDate ?? attributes['commissioningDate'],
          plan.nextMaintenanceDate ?? attributes['nextMaintenanceDate'],
          plan.expectedLifespanYears ?? attributes['expectedLifespanYears'],
          plan.createdAt,
          plan.updatedAt
        ];
        const rowValues: string[] = baseValuesSource.map(value => this.serialiseForExport(value));

        const latestSnapshot = this.normaliseOperationalData(plan.operationalData ?? attributes['operationalData']);
        OPERATIONAL_SNAPSHOT_KEYS.forEach(key => {
          const value = latestSnapshot ? (latestSnapshot as any)[key] : null;
          rowValues.push(this.serialiseForExport(value));
        });

        const orderedHistory = this.getOrderedOperationalHistory(plan, attributes);
        for (let index = 0; index < maxOperationalHistoryLength; index += 1) {
          const entry = orderedHistory[index];
          rowValues.push(this.serialiseForExport(entry?.capturedAt ?? ''));
          OPERATIONAL_SNAPSHOT_KEYS.forEach(key => {
            const value = entry?.snapshot ? (entry.snapshot as any)[key] : null;
            rowValues.push(this.serialiseForExport(value));
          });
        }

        const orderedRecurringHistory = this.getOrderedRecurringHistory(plan, attributes);
        for (let index = 0; index < maxRecurringHistoryLength; index += 1) {
          const entry = orderedRecurringHistory[index];
          rowValues.push(this.serialiseForExport(entry?.capturedAt ?? ''));
          recurringValueKeys.forEach(key => {
            const value = entry?.values ? entry.values[key] : null;
            rowValues.push(this.serialiseForExport(value));
          });
        }

        const attributeValues = attributeKeys.map(key => this.serialiseForExport(attributes[key]));
        rowValues.push(...attributeValues);

        return rowValues.map(value => this.escapeForCsv(value)).join(',');
      });

      const csvContent = ['\ufeff' + headerRow, ...lines].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      const safeSlug = slugKey(fileSlug) || 'asset-report';
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `prmsc-${safeSlug}-${timestamp}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      this.notificationService.push(successMessage, { type: 'success' });
    } catch (error) {
      console.error('Asset export failed', error);
      this.notificationService.push('Unable to generate the asset Excel report. Please try again.', {
        type: 'critical'
      });
    }
  }

  openAssetInsights(plan?: ConsultantPlan | null): void {
    if (!plan) {
      this.assetInsightOpen.set(false);
      return;
    }
    this.assetInsightOpen.set(true);
  }

  closeAssetInsights(): void {
    this.assetInsightOpen.set(false);
  }

  openMaintenanceModule(plan?: ConsultantPlan | null): void {
    const pending = this.pendingMaintenancePlans();
    const initial = plan
      ?? this.maintenanceSelectedPlan()
      ?? this.selectedPlan()
      ?? (pending.length ? pending[0] : null);

    this.maintenanceModuleOpen.set(true);
    this.maintenanceError.set('');
    this.maintenanceFiles.set([]);
    this.selectMaintenancePlan(initial);
  }

  closeMaintenanceModule(): void {
    this.maintenanceModuleOpen.set(false);
    this.maintenanceSelectedPlan.set(null);
    this.maintenanceFiles.set([]);
    this.maintenanceForm.reset({
      maintenanceType: 'preventive',
      maintenanceDate: this.toDateInputValue(new Date()),
      status: 'completed',
      cost: '',
      remarks: '',
      nextMaintenanceDate: '',
    });
    this.maintenanceForm.markAsPristine();
    this.maintenanceError.set('');
  }

  selectMaintenancePlan(plan: ConsultantPlan | null): void {
    this.maintenanceSelectedPlan.set(plan ?? null);
    this.maintenanceFiles.set([]);
    this.hydrateMaintenanceForm(plan);
  }

  onMaintenanceFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files ? Array.from(input.files) : [];
    this.maintenanceFiles.set(files);
  }

  removeMaintenanceFile(index: number): void {
    const files = [...this.maintenanceFiles()];
    files.splice(index, 1);
    this.maintenanceFiles.set(files);
  }

  maintenanceDueLabel(plan: ConsultantPlan): string {
    const info = this.describeMaintenanceDeadline(plan);
    return info.label;
  }

  maintenanceDueAccent(plan: ConsultantPlan): 'critical' | 'warning' | 'neutral' {
    const info = this.describeMaintenanceDeadline(plan);
    return info.tone;
  }

  maintenanceHistory(): MaintenanceRecord[] {
    const plan = this.maintenanceSelectedPlan();
    if (!plan) {
      return [];
    }
    if (Array.isArray(plan.maintenanceHistory) && plan.maintenanceHistory.length) {
      return plan.maintenanceHistory;
    }
    return this.normalizeMaintenanceHistory((plan.attributes as any)?.['maintenanceHistory']);
  }

  formatMaintenanceDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }
    const parsed = this.safeParseDate(value);
    if (!parsed) {
      return '—';
    }
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  submitMaintenanceUpdate(): void {
    const plan = this.maintenanceSelectedPlan();
    if (!plan) {
      return;
    }

    if (this.maintenanceForm.invalid) {
      this.maintenanceForm.markAllAsTouched();
      this.maintenanceError.set('Please complete the required maintenance fields.');
      return;
    }

    const raw = this.maintenanceForm.getRawValue();
    const maintenanceDate = this.toIsoDateString(raw.maintenanceDate) ?? new Date().toISOString();
    const nextMaintenanceDate = this.toIsoDateString(raw.nextMaintenanceDate);
    const maintenanceType = String(raw.maintenanceType || 'preventive') as MaintenanceRecord['type'];
    const status = String(raw.status || 'completed') as MaintenanceRecord['status'];
    const cost = raw.cost !== null && raw.cost !== undefined && raw.cost !== '' ? Number(raw.cost) : 0;

    const history = Array.isArray(plan.maintenanceHistory) && plan.maintenanceHistory.length
      ? [...plan.maintenanceHistory]
      : this.normalizeMaintenanceHistory((plan.attributes as any)?.['maintenanceHistory']);

    this.maintenanceSaving.set(true);
    this.maintenanceError.set('');

    const files = this.maintenanceFiles();
    const upload$ = files.length ? this.plansService.uploadAttachments(files) : of<ConsultantPlanAttachment[]>([]);

    upload$
      .pipe(
        switchMap((attachments) => {
          const record: MaintenanceRecord = {
            id: `mnt-${Date.now()}`,
            date: maintenanceDate,
            type: maintenanceType,
            description: raw.remarks || '',
            cost: Number.isFinite(cost) ? cost : 0,
            status,
            notes: raw.remarks || '',
            attachments,
          } as MaintenanceRecord;

          history.push(record);

          const updatedAttributes = {
            ...(plan.attributes || {}),
            maintenanceHistory: history,
          } as Record<string, any>;

          if (nextMaintenanceDate) {
            updatedAttributes['nextMaintenanceDate'] = nextMaintenanceDate;
          }

          const payload: any = {
            attributes: updatedAttributes,
          };

          if (nextMaintenanceDate) {
            payload.nextMaintenanceDate = nextMaintenanceDate;
          }

          return this.plansService.updatePlan(plan.id, payload);
        }),
        catchError((error) => {
          console.error('Maintenance update failed', error);
          const message = error?.error?.msg || error?.message || 'Unable to update maintenance record.';
          this.maintenanceError.set(message);
          this.notificationService.push(message, { type: 'critical' });
          return of(null);
        }),
        finalize(() => {
          this.maintenanceSaving.set(false);
        }),
      )
      .subscribe((response) => {
        if (!response) {
          return;
        }
        const normalised = this.normalisePlan(response);
        if (normalised) {
          const updatedList = this.mergePlanIntoList(normalised);
          this.planList.set(updatedList);
          if (this.selectedPlan()?.id === normalised.id) {
            this.selectedPlan.set(normalised);
          }
          this.refreshMaintenanceSelection(normalised.id);
          this.notificationService.push('Maintenance action recorded successfully.', { type: 'success' });
        }
        this.maintenanceFiles.set([]);
        this.maintenanceForm.markAsPristine();
      });
  }

  private buildAssetInsight(plan: ConsultantPlan | null): AssetInsightSnapshot | null {
    if (!plan) {
      return null;
    }
    const attributes = plan.attributes ?? {};
    const operational = this.normaliseOperationalData(plan.operationalData ?? attributes['operationalData']);
    const history = Array.isArray(plan.maintenanceHistory) && plan.maintenanceHistory.length
      ? plan.maintenanceHistory
      : this.normalizeMaintenanceHistory(attributes['maintenanceHistory']);
    const coordinates = this.extractPointCoordinates(plan.feature) ?? plan.coordinates ?? null;
    const normalisedHistory = plan.operationalSnapshotHistory?.length
      ? plan.operationalSnapshotHistory
      : this.normaliseOperationalHistory(attributes['operationalSnapshotHistory']);
    const hasOperationalSnapshots = Boolean(operational) || normalisedHistory.length > 0;
    let insightHistory = hasOperationalSnapshots && normalisedHistory.length ? [...normalisedHistory] : [];
    if (hasOperationalSnapshots && !insightHistory.length && operational) {
      const capturedAt = this.toIsoDateString(plan.updatedAt) ?? this.toIsoDateString(plan.createdAt) ?? new Date().toISOString();
      insightHistory = [{ capturedAt, snapshot: operational }];
    }
    const trimmedHistory = hasOperationalSnapshots ? this.trimOperationalHistory(insightHistory, 6) : [];
    const chartHistory = hasOperationalSnapshots ? this.ensureHistoryForChart(trimmedHistory) : [];

    let trendLabels: string[] = [];
    let metrics: AssetInsightMetric[] = [];
    if (hasOperationalSnapshots) {
      const runSeriesInfo = this.buildHistorySeries(chartHistory, snap => snap.averageDailyRunHours, { min: 0 });
      const availabilitySeriesInfo = this.buildHistorySeries(chartHistory, snap => snap.availabilityPercent, { min: 0, max: 100 });
      const energySeriesInfo = this.buildHistorySeries(
        chartHistory,
        snap => snap.energyConsumptionSubMeter ?? snap.unitsImportKwh,
        { min: 0 },
      );
      const productionSeriesInfo = this.buildHistorySeries(chartHistory, snap => snap.bulkMeterReadingProduction, { min: 0 });

      trendLabels = chartHistory.length
        ? chartHistory.map(entry => this.formatTrendLabel(entry.capturedAt))
        : ['Captured', 'Current'];
      const desiredLength = runSeriesInfo.series.length;
      while (trendLabels.length < desiredLength) {
        trendLabels = [...trendLabels, trendLabels[trendLabels.length - 1] ?? 'Current'];
      }

      metrics = [
        this.buildInsightMetric('run-hours', 'Daily Run Hours', runSeriesInfo.series, 'h/day', runSeriesInfo.hasData),
        this.buildInsightMetric('availability', 'Availability', availabilitySeriesInfo.series, '%', availabilitySeriesInfo.hasData),
        this.buildInsightMetric('energy', 'Energy Use', energySeriesInfo.series, 'kWh', energySeriesInfo.hasData),
        this.buildInsightMetric('production', 'Bulk Production', productionSeriesInfo.series, 'm³', productionSeriesInfo.hasData),
      ];
    }

    const keyFacts = this.buildInsightFacts(plan, operational);
    const maintenanceTimeline = this.buildMaintenanceTimeline(history);
    const operationalNotes = this.buildOperationalNotes(plan, operational);
    const healthScore = this.deriveHealthScore(operational, history);
    const locationLabel = coordinates
      ? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`
      : 'Location pending capture';

    return {
      plan,
      coordinates,
      locationLabel,
      metrics,
      trendLabels,
      trendHistory: hasOperationalSnapshots ? chartHistory : [],
      healthScore,
      healthDescriptor: this.describeHealthScore(healthScore),
      keyFacts,
      maintenanceTimeline,
      operationalNotes,
      powerProfile: operational?.powerSource ?? attributes['powerSource'] ?? null,
    };
  }

  private buildInsightMetric(id: string, label: string, series: number[], unit: string | undefined, hasData: boolean): AssetInsightMetric {
    const safeSeries = series.length ? series : [0, 0];
    const latest = safeSeries[safeSeries.length - 1] ?? 0;
    const previous = safeSeries[safeSeries.length - 2] ?? latest;
    const baseline = Math.abs(previous) > 1e-2 ? previous : 1;
    const changePercent = ((latest - previous) / baseline) * 100;
    const direction: 'up' | 'down' | 'steady' = !hasData || Math.abs(changePercent) < 0.5
      ? 'steady'
      : changePercent > 0
        ? 'up'
        : 'down';
    const precision = unit === '%' ? 0 : latest < 10 ? 1 : 0;
    const valueText = hasData ? this.formatMetricValue(latest, precision) : '—';
    const magnitude = this.formatMetricValue(Math.abs(changePercent), 1);
    const deltaText = hasData
      ? direction === 'steady'
        ? '~0%'
        : `${changePercent > 0 ? '+' : '-'}${magnitude}%`
      : 'No data';
    const points = hasData ? this.seriesToSvgPoints(safeSeries) : '';
    return {
      id,
      label,
      unit,
      value: valueText,
      delta: deltaText,
      deltaDirection: direction,
      points,
      series: safeSeries,
    };
  }

  private formatMetricValue(value: number, precision: number): string {
    if (!Number.isFinite(value)) {
      return '0';
    }
    if (precision <= 0) {
      return Math.round(value).toLocaleString('en-US');
    }
    const fixed = value.toFixed(precision);
    return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
  }

  private seriesToSvgPoints(series: number[], width = 100, height = 36): string {
    if (!series.length) {
      return '';
    }
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = max - min || 1;
    const span = series.length > 1 ? series.length - 1 : 1;
    return series
      .map((value, index) => {
        const x = (index / span) * width;
        const y = height - ((value - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  private trimOperationalHistory(history: OperationalSnapshotHistoryEntry[], limit: number): OperationalSnapshotHistoryEntry[] {
    if (!history.length) {
      return [];
    }
    if (history.length <= limit) {
      return [...history];
    }
    return history.slice(history.length - limit);
  }

  private ensureHistoryForChart(history: OperationalSnapshotHistoryEntry[]): OperationalSnapshotHistoryEntry[] {
    if (history.length >= 2) {
      return history;
    }
    if (history.length === 1) {
      return [
        history[0],
        {
          capturedAt: new Date().toISOString(),
          snapshot: history[0].snapshot,
        },
      ];
    }
    return [];
  }

  private buildHistorySeries(
    history: OperationalSnapshotHistoryEntry[],
    selector: (snapshot: OperationalSnapshot) => number | null | undefined,
    clamp?: { min?: number; max?: number },
  ): { series: number[]; hasData: boolean } {
    if (!history.length) {
      return { series: [0, 0], hasData: false };
    }
    const values: number[] = [];
    let hasData = false;
    let lastValue = clamp?.min ?? 0;
    history.forEach(entry => {
      const selected = selector(entry.snapshot);
      const numeric = selected !== null && selected !== undefined
        ? this.normaliseNumericInput(selected, clamp)
        : null;
      if (numeric !== null) {
        hasData = true;
        lastValue = numeric;
        values.push(numeric);
      } else {
        values.push(lastValue);
      }
    });
    const finalSeries = hasData ? values : values.map(() => 0);
    return { series: this.ensureSeriesLength(finalSeries), hasData };
  }

  private ensureSeriesLength(series: number[]): number[] {
    if (series.length >= 2) {
      return series;
    }
    const value = series.length ? series[0] : 0;
    return [value, value];
  }

  private formatTrendLabel(value: string): string {
    const parsed = this.safeParseDate(value);
    if (!parsed) {
      return 'Now';
    }
    return parsed.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }

  private deriveHealthScore(operational: OperationalSnapshot | null, history: MaintenanceRecord[]): number {
    let score = 70;
    const availability = this.normaliseNumericInput(operational?.availabilityPercent, { min: 0, max: 100 });
    if (availability !== null) {
      score = (score * 0.4) + (availability * 0.6);
    }
    const runHours = this.normaliseNumericInput(operational?.averageDailyRunHours, { min: 0 });
    if (runHours !== null) {
      const efficiency = Math.max(0, Math.min(runHours / 18, 1));
      score = (score * 0.7) + (efficiency * 30);
    }
    if (history.length) {
      const sorted = [...history].sort((a, b) => {
        const aDate = this.safeParseDate(a.date);
        const bDate = this.safeParseDate(b.date);
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      });
      const latest = sorted[0];
      const daysSince = this.daysSince(latest?.date);
      if (daysSince !== null) {
        if (daysSince <= 30) {
          score += 5;
        } else if (daysSince > 120) {
          score -= 7;
        }
      }
    }
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private describeHealthScore(score: number): string {
    if (score >= 85) {
      return 'Asset performing within optimal thresholds.';
    }
    if (score >= 70) {
      return 'Performance is healthy with routine monitoring recommended.';
    }
    if (score >= 55) {
      return 'Performance trending down; schedule inspection soon.';
    }
    return 'Critical attention required to restore acceptable performance.';
  }

  private buildInsightFacts(plan: ConsultantPlan, operational: OperationalSnapshot | null): AssetInsightInfoItem[] {
    const facts: AssetInsightInfoItem[] = [];
    const seen = new Set<string>();
    const addFact = (label: string, value: unknown) => {
      if (value === null || value === undefined) {
        return;
      }
      const text = typeof value === 'string' ? value.trim() : String(value);
      if (!text || text === '—') {
        return;
      }
      const key = `${label.toLowerCase()}::${text.toLowerCase()}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      facts.push({ label, value: text });
    };

    if (plan.tehsil) {
      addFact('Tehsil', plan.tehsil);
    }
    if (plan.district) {
      addFact('District', plan.district);
    }
    if (plan.commissioningDate) {
      addFact('Commissioned', this.formatMaintenanceDate(plan.commissioningDate));
    }
    const nextDue = plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(plan.attributes);
    if (nextDue) {
      addFact('Next Maintenance', this.formatMaintenanceDate(nextDue));
    }
    const lifespan = plan.expectedLifespanYears ?? plan.attributes?.['expectedLifespanYears'];
    if (lifespan !== null && lifespan !== undefined && lifespan !== '') {
      addFact('Expected Lifespan', `${lifespan} years`);
    }
    if (operational?.powerSource) {
      addFact('Power Source', operational.powerSource);
    }
    if (operational?.bulkMeterReadingProduction !== null && operational?.bulkMeterReadingProduction !== undefined) {
      addFact('Bulk Meter', `${this.formatMetricValue(operational.bulkMeterReadingProduction, 0)} m³`);
    }

    this.attributeEntries(plan)
      .filter(entry => entry.value !== null && entry.value !== undefined && entry.value !== '')
      .slice(0, 6)
      .forEach(entry => addFact(entry.label, entry.value));

    return facts;
  }

  private buildMaintenanceTimeline(history: MaintenanceRecord[]): AssetInsightTimelineEntry[] {
    if (!history.length) {
      return [];
    }
    return [...history]
      .sort((a, b) => {
        const aDate = this.safeParseDate(a.date);
        const bDate = this.safeParseDate(b.date);
        return (bDate?.getTime() ?? 0) - (aDate?.getTime() ?? 0);
      })
      .slice(0, 5)
      .map(record => {
        const status = (record.status || '').toLowerCase();
        let tone: 'success' | 'warning' | 'critical' | 'neutral' = 'neutral';
        if (status === 'completed') {
          tone = 'success';
        } else if (status === 'pending') {
          tone = 'warning';
        } else if (status === 'cancelled') {
          tone = 'critical';
        }
        const label = record.type ? this.titleCase(record.type) : 'Maintenance';
        const description = record.notes || record.description || 'Maintenance activity recorded.';
        return {
          label,
          dateLabel: this.formatMaintenanceDate(record.date),
          description,
          tone,
        };
      });
  }

  private buildOperationalNotes(plan: ConsultantPlan, operational: OperationalSnapshot | null): string[] {
    const notes: string[] = [];
    const pushNote = (value: unknown) => {
      if (!value && value !== 0) {
        return;
      }
      const text = typeof value === 'string' ? value.trim() : String(value);
      if (!text || text === '—') {
        return;
      }
      if (!notes.some(existing => existing.toLowerCase() === text.toLowerCase())) {
        notes.push(text);
      }
    };

    pushNote(operational?.operationalNotes);
    pushNote(plan.attributes?.['notes']);

    if (operational?.vfdProductionKw !== null && operational?.vfdProductionKw !== undefined) {
      pushNote(`VFD production currently ${this.formatMetricValue(operational.vfdProductionKw, 1)} kW.`);
    }
    if (operational?.inverterProductionKw !== null && operational?.inverterProductionKw !== undefined) {
      pushNote(`Inverter output at ${this.formatMetricValue(operational.inverterProductionKw, 1)} kW.`);
    }
    if (operational?.bulkMeterAttachment) {
      pushNote(`Bulk meter attachment: ${operational.bulkMeterAttachment}`);
    }

    if (!notes.length) {
      notes.push('No operational remarks recorded for this asset yet.');
    }

    return notes.slice(0, 5);
  }

  private daysSince(value: string | null | undefined): number | null {
    const parsed = this.safeParseDate(value);
    if (!parsed) {
      return null;
    }
    const today = this.startOfDay(new Date());
    const target = this.startOfDay(parsed);
    const diff = today.getTime() - target.getTime();
    return Math.round(diff / (24 * 60 * 60 * 1000));
  }

  private titleCase(text: string): string {
    if (!text) {
      return '';
    }
    return text
      .toLowerCase()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private bindFormListeners(): void {
    const assetTypeControl = this.planForm.get('assetType');
    if (assetTypeControl) {
      const sub = assetTypeControl.valueChanges.subscribe(value => this.onAssetTypeChanged(value));
      this.subscriptions.push(sub);
    }

    const requisitionControl = this.planForm.get('requisitionId');
    if (requisitionControl) {
      const sub = requisitionControl.valueChanges.subscribe(value => this.applySiteDefaults(value));
      this.subscriptions.push(sub);
    }
  }

  private resolveAssetForm(assetType: string | null): AssetFormConfig | null {
    if (!assetType) {
      return null;
    }
    const direct = this.assetFormLibrary.find(config => config.assetTypes.includes(assetType));
    if (direct) {
      return direct;
    }
    return this.assetFormLibrary.find(config => config.assetTypes.includes('custom-asset')) ?? null;
  }

  private activateAssetForm(assetType: string | null, resetValues = false): void {
    const config = this.resolveAssetForm(assetType);
    this.activeAssetConfig = config;
    const fields = config?.fields ?? [];
    this.ensureAssetSpecControls(fields);
    this.updateAssetSpecValidators(fields);
    if (resetValues) {
      this.resetAssetSpecValues();
    }
    const partition = this.partitionAssetFieldDisplay(assetType, fields);
    this.activeAssetFields.set(partition.oneTime);
    this.activeRecurringFields.set(partition.recurring);
    if (assetType === 'overhead-reservoir' && partition.recurring.length) {
      this.activeAssetFormMeta.set({
        title: 'OHR One-time Configuration',
        summary: 'Document static scheme context and mechanical design parameters captured once.'
      });
      this.activeRecurringMeta.set({
        title: 'OHR Recurring Measurements',
        summary: 'Record daily or monthly readings independently; each submission is tracked in the history table below.'
      });
    } else {
      this.activeAssetFormMeta.set(config ? { title: config.title, summary: config.summary } : null);
      this.activeRecurringMeta.set(null);
    }
    this.currentAssetType.set(assetType ?? '');
    if (assetType && (resetValues || !this.selectedPlan())) {
      this.prepareDrawingForAsset(assetType, config);
    }
  }

  private ensureAssetSpecControls(fields: AssetFieldConfig[]): void {
    const group = this.assetSpecsGroup;
    fields.forEach(field => {
      if (field.role === 'section') {
        return;
      }
      if (!group.contains(field.control)) {
        group.addControl(field.control, this.fb.control(''));
      }
    });
  }

  private updateAssetSpecValidators(fields: AssetFieldConfig[]): void {
    const group = this.assetSpecsGroup;
    const active = new Set(fields.map(field => field.control));
    Object.entries(group.controls).forEach(([key, control]) => {
      const field = fields.find(item => item.control === key);
      if (field?.required) {
        control.setValidators(Validators.required);
      } else {
        control.clearValidators();
      }
      control.updateValueAndValidity({ emitEvent: false });
      if (!active.has(key) && !control.disabled) {
        control.markAsPristine();
        control.markAsUntouched();
      }
    });
  }

  private resetAssetSpecValues(): void {
    this.assetSpecsGroup.reset({}, { emitEvent: false });
    this.unlockAllAssetSpecControls();
    Object.values(this.assetSpecsGroup.controls).forEach(control => {
      control.markAsPristine();
      control.markAsUntouched();
    });
  }


  private patchAssetSpecsFromAttributes(attributes: Record<string, any>): void {
    if (!this.activeAssetConfig) {
      this.resetAssetSpecValues();
      return;
    }
    const patch: Record<string, any> = {};
    for (const field of this.activeAssetConfig.fields) {
      if (field.role === 'section') {
        continue;
      }
      if (!field.attributeKey) {
        continue;
      }
      const lookupKeys = [field.attributeKey, ...(field.aliases ?? [])];
      let value: any = '';
      for (const key of lookupKeys) {
        const candidate = attributes[key];
        if (candidate !== undefined && candidate !== null && candidate !== '') {
          value = candidate;
          break;
        }
      }
      patch[field.control] = value ?? '';
    }
    this.assetSpecsGroup.patchValue(patch, { emitEvent: false });
    Object.keys(patch).forEach(key => {
      const control = this.assetSpecsGroup.get(key);
      control?.markAsPristine();
      control?.markAsUntouched();
    });
    this.applyOneTimeFieldLocks(this.currentAssetType(), attributes, !!this.selectedPlan());
  }

  private collectAssetSpecifications(assetType: string | null): {
    combined: Record<string, any>;
    oneTime: Record<string, any>;
    recurring: Record<string, any>;
  } {
    const config = assetType ? this.resolveAssetForm(assetType) : this.activeAssetConfig;
    const fields = config?.fields ?? [];
    const group = this.assetSpecsGroup;
    const combined: Record<string, any> = {};
    const oneTime: Record<string, any> = {};
    const recurring: Record<string, any> = {};

    fields.forEach(field => {
      if (field.role === 'section' || !field.attributeKey) {
        return;
      }
      const control = group.get(field.control);
      if (!control) {
        return;
      }
      const value = this.normaliseAssetSpecValue(field, control);
      if (value === undefined) {
        return;
      }
      combined[field.attributeKey] = value;
      if (this.isRecurringField(field)) {
        recurring[field.attributeKey] = value;
      } else {
        oneTime[field.attributeKey] = value;
      }
    });

    return { combined, oneTime, recurring };
  }

  private collectExportAttributeKeys(plans: ConsultantPlan[]): string[] {
    const keys = new Set<string>();
    plans.forEach(plan => {
      const attributes = plan.attributes ?? {};
      Object.keys(attributes).forEach(key => {
        if (EXCLUDED_EXPORT_ATTRIBUTE_KEYS.has(key)) {
          return;
        }
        keys.add(key);
      });
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }

  private collectRecurringValueKeys(plans: ConsultantPlan[]): string[] {
    const keys = new Set<string>();
    plans.forEach(plan => {
      const attributes = plan.attributes ?? {};
      const history = this.getOrderedRecurringHistory(plan, attributes);
      history.forEach(entry => {
        Object.keys(entry.values ?? {}).forEach(key => {
          keys.add(key);
        });
      });
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }

  private maxOperationalHistoryLength(plans: ConsultantPlan[]): number {
    let max = 0;
    plans.forEach(plan => {
      const attributes = plan.attributes ?? {};
      const history = this.getOrderedOperationalHistory(plan, attributes);
      if (history.length > max) {
        max = history.length;
      }
    });
    return max;
  }

  private maxRecurringHistoryLength(plans: ConsultantPlan[]): number {
    let max = 0;
    plans.forEach(plan => {
      const attributes = plan.attributes ?? {};
      const history = this.getOrderedRecurringHistory(plan, attributes);
      if (history.length > max) {
        max = history.length;
      }
    });
    return max;
  }

  private getOrderedOperationalHistory(
    plan: ConsultantPlan,
    attributes: Record<string, any>,
  ): OperationalSnapshotHistoryEntry[] {
    const history = plan.operationalSnapshotHistory
      ?? this.normaliseOperationalHistory(attributes?.['operationalSnapshotHistory']);
    if (!history?.length) {
      return [];
    }
    return [...history].reverse();
  }

  private getOrderedRecurringHistory(
    plan: ConsultantPlan,
    attributes: Record<string, any>,
  ): OhrRecurringHistoryEntry[] {
    const history = plan.ohrRecurringHistory
      ?? this.normaliseOhrRecurringHistory(attributes?.['ohrRecurringHistory']);
    if (!history?.length) {
      return [];
    }
    return [...history].reverse();
  }

  private serialiseForExport(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (value instanceof Date) {
      try {
        return value.toISOString();
      } catch {
        return String(value);
      }
    }
    if (Array.isArray(value)) {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return value.join(', ');
      }
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value, null, 2);
      } catch {
        return Object.prototype.toString.call(value);
      }
    }
    return String(value);
  }

  private escapeForCsv(value: unknown): string {
    const text = (value ?? '').toString().replace(/\r?\n/g, '\n');
    const escaped = text.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private partitionAssetFieldDisplay(assetType: string | null, fields: AssetFieldConfig[]): {
    oneTime: AssetFieldConfig[];
    recurring: AssetFieldConfig[];
  } {
    if (assetType !== 'overhead-reservoir') {
      return { oneTime: fields, recurring: [] };
    }
    const oneTime: AssetFieldConfig[] = [];
    const recurring: AssetFieldConfig[] = [];
    fields.forEach(field => {
      if (field.role === 'section') {
        oneTime.push(field);
        return;
      }
      if (this.isRecurringField(field)) {
        recurring.push(field);
        return;
      }
      oneTime.push(field);
    });
    return { oneTime, recurring };
  }

  private isRecurringField(field: AssetFieldConfig | null | undefined): boolean {
    if (!field) {
      return false;
    }
    const label = (field.frequencyLabel || '').trim().toLowerCase();
    if (!label) {
      return false;
    }
    return label !== 'one-time' && label !== 'one time';
  }

  private isOneTimeField(field: AssetFieldConfig | null | undefined): boolean {
    if (!field) {
      return false;
    }
    return !this.isRecurringField(field);
  }

  private hasAttributeValue(attributes: Record<string, any> | null | undefined, field: AssetFieldConfig): boolean {
    if (!attributes || !field.attributeKey) {
      return false;
    }
    const lookupKeys = [field.attributeKey, ...(field.aliases ?? [])];
    return lookupKeys.some(key => {
      const value = attributes[key];
      if (value === null || value === undefined) {
        return false;
      }
      if (typeof value === 'string') {
        return value.trim().length > 0;
      }
      if (typeof value === 'number') {
        return Number.isFinite(value);
      }
      if (typeof value === 'boolean') {
        return true;
      }
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return true;
    });
  }

  private unlockAllAssetSpecControls(): void {
    Object.values(this.assetSpecsGroup.controls).forEach(control => {
      if (control.disabled) {
        control.enable({ emitEvent: false });
      }
    });
  }

  private applyOneTimeFieldLocks(
    assetType: string | null,
    attributes: Record<string, any> | null | undefined,
    hasPersistedPlan: boolean,
  ): void {
    this.unlockAllAssetSpecControls();
    if (assetType !== 'overhead-reservoir') {
      return;
    }
    if (!hasPersistedPlan || this.isSuperAdminUser()) {
      return;
    }
    const config = this.resolveAssetForm(assetType);
    const fields = config?.fields ?? [];
    fields.forEach(field => {
      if (field.role === 'section' || !field.attributeKey) {
        return;
      }
      if (!this.isOneTimeField(field)) {
        return;
      }
      if (!this.hasAttributeValue(attributes, field)) {
        return;
      }
      const control = this.assetSpecsGroup.get(field.control);
      control?.disable({ emitEvent: false });
    });
  }

  private isSuperAdminUser(): boolean {
    return this.superAdminAccess();
  }

  private bootstrapCurrentUserRole(): void {
    try {
      if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        this.superAdminAccess.set(false);
        return;
      }
      const stored = window.localStorage.getItem('user');
      if (!stored) {
        this.superAdminAccess.set(false);
        return;
      }
      const parsed = JSON.parse(stored);
      const role = (parsed?.role ?? '').toString().trim().toLowerCase();
      this.superAdminAccess.set(role === 'super admin');
    } catch {
      this.superAdminAccess.set(false);
    }
  }

  private normaliseAssetSpecValue(field: AssetFieldConfig, control: AbstractControl | null): any {
    if (!control) {
      return undefined;
    }
    let value = control.value;
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'string') {
      value = value.trim();
    }
    if (value === '') {
      return undefined;
    }
    if (field.type === 'number') {
      const numeric = Number(value);
      if (Number.isFinite(numeric)) {
        return numeric;
      }
      return undefined;
    }
    return value;
  }

  private humaniseAttributeKey(key: string): string {
    if (!key) {
      return '';
    }
    const spaced = key
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!spaced) {
      return '';
    }
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }

  formatRecurringValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? String(value) : '—';
    }
    return String(value);
  }

  private prepareDrawingForAsset(assetType: string, config: AssetFormConfig | null): void {
    const geometry = this.preferredGeometryForAsset(assetType, config);
    const mode = this.drawModeForGeometry(geometry);
    const assetDefinition = this.resolveAsset(assetType);
    const assetLabel = assetDefinition?.label || assetDefinition?.value || assetType;
    const instruction = this.drawingInstructionFor(assetLabel, geometry);
    const draft = this.draftFeature();
    const existingGeometry = this.classifyGeometry(draft);

    // Keep the current draft if it already matches the preferred geometry
    if (draft && geometry === existingGeometry) {
      return;
    }

    if (instruction) {
      this.draftSummary.set(instruction);
    }

    if (mode) {
      this.mapWorkspace?.beginDrawing(mode, { summary: instruction });
    }
  }

  private preferredGeometryForAsset(assetType: string | null, config: AssetFormConfig | null): GeometryClass {
    if (config?.geometry) {
      return config.geometry;
    }
    const slug = (assetType || '').toLowerCase();
    if (!slug) {
      return 'point';
    }
    if (slug.includes('line') || slug.includes('pipeline')) {
      return 'line';
    }
    if (slug.includes('reservoir') || slug.includes('tank') || slug.includes('plant') || slug.includes('room') || slug.includes('facility')) {
      return 'area';
    }
    const assetDefinition = this.resolveAsset(assetType || '');
    if (assetDefinition?.category === 'Sewerage' && slug.includes('manhole')) {
      return 'point';
    }
    if (assetDefinition?.category === 'Support Facility') {
      return 'area';
    }
    return 'point';
  }

  private drawModeForGeometry(geometry: GeometryClass | null): 'polyline' | 'marker' | 'polygon' | null {
    if (geometry === 'line') {
      return 'polyline';
    }
    if (geometry === 'point') {
      return 'marker';
    }
    if (geometry === 'area') {
      return 'polygon';
    }
    return null;
  }

  private drawingInstructionFor(label: string, geometry: GeometryClass): string {
    const assetLabel = label ? `"${label}"` : 'the asset';
    if (geometry === 'line') {
      return `Drawing alignment for ${assetLabel}: click each bend on the map and double-click to finish.`;
    }
    if (geometry === 'area') {
      return `Outlining footprint for ${assetLabel}: click around the perimeter and close the shape on the starting point.`;
    }
    if (geometry === 'point') {
      return `Place ${assetLabel} on the map: click once to drop the location.`;
    }
    return 'Draw the infrastructure footprint on the map.';
  }

  private onAssetTypeChanged(value: string | null): void {
    const definition = this.resolveAsset(value ?? '');
    const categoryControl = this.planForm.get('category');
    if (categoryControl) {
      categoryControl.setValue(definition ? definition.category : '');
    }
    if (!this.titleManualOverride && definition) {
      this.planForm.get('title')?.setValue(definition.label);
    }
    this.activateAssetForm(definition?.value || value || '', true);
  }

  private applySiteDefaults(requisitionId: string | null): void {
    if (!requisitionId) {
      return;
    }
    const site = this.siteIndex.get(requisitionId);
    if (!site) {
      return;
    }
    if (!this.planForm.get('tehsil')?.value) {
      this.planForm.get('tehsil')?.setValue(site.tehsil);
    }
    if (!this.planForm.get('district')?.value) {
      this.planForm.get('district')?.setValue(site.district);
    }
  }

  private resolveNextMaintenanceDate(attributes: Record<string, any> | null | undefined): string | null {
    if (!attributes || typeof attributes !== 'object') {
      return null;
    }
    const candidate = attributes['nextMaintenanceDate'] ?? attributes['maintenanceDueDate'] ?? null;
    if (!candidate) {
      return null;
    }
    const text = String(candidate).trim();
    return text ? text : null;
  }

  private safeParseDate(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const trimmed = String(value).trim();
    if (!trimmed) {
      return null;
    }
    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) {
      return direct;
    }
    const fallback = new Date(`${trimmed}T00:00:00Z`);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }

  private startOfDay(input: Date): Date {
    const clone = new Date(input.getTime());
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private toIsoDateString(value: unknown): string | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }
    const text = String(value).trim();
    if (!text) {
      return null;
    }
    const parsed = this.safeParseDate(text);
    return parsed ? parsed.toISOString() : null;
  }

  private hydrateMaintenanceForm(plan: ConsultantPlan | null): void {
    const nextDue = plan
      ? this.toDateInputValue(plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(plan.attributes))
      : '';

    this.maintenanceForm.reset(
      {
        maintenanceType: 'preventive',
        maintenanceDate: this.toDateInputValue(new Date()),
        status: 'completed',
        cost: '',
        remarks: '',
        nextMaintenanceDate: nextDue,
      },
      { emitEvent: false },
    );

    this.maintenanceForm.markAsPristine();
    this.maintenanceForm.markAsUntouched();
  }

  private describeMaintenanceDeadline(plan: ConsultantPlan): { label: string; tone: 'critical' | 'warning' | 'neutral' } {
    const dueText = plan.nextMaintenanceDate ?? this.resolveNextMaintenanceDate(plan.attributes);
    const dueDate = this.safeParseDate(dueText);
    if (!dueDate) {
      return { label: 'Schedule not set', tone: 'neutral' };
    }

    const today = this.startOfDay(new Date());
    const diffMs = dueDate.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));

    if (diffDays < 0) {
      const daysOverdue = Math.abs(diffDays);
      return {
        label: `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} overdue`,
        tone: 'critical',
      };
    }

    if (diffDays === 0) {
      return { label: 'Due today', tone: 'warning' };
    }

    const label = `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    const tone: 'critical' | 'warning' | 'neutral' = diffDays <= 7 ? 'warning' : 'neutral';
    return { label, tone };
  }

  private normalizeMaintenanceHistory(raw: any): MaintenanceRecord[] {
    if (!Array.isArray(raw) || !raw.length) {
      return [];
    }

    return raw
      .map((entry: any) => {
        if (!entry) {
          return null;
        }

        const id = entry.id ? String(entry.id) : `mnt-${Date.now()}`;
        const dateIso = this.toIsoDateString(entry.date) ?? new Date().toISOString();
        const type = (entry.type || 'preventive') as MaintenanceRecord['type'];
        const status = (entry.status || 'completed') as MaintenanceRecord['status'];
        const cost = entry.cost !== null && entry.cost !== undefined && entry.cost !== '' ? Number(entry.cost) : 0;
        const notes = entry.notes || entry.description || '';
        const description = entry.description || notes || '';
        const attachments = Array.isArray(entry.attachments) ? entry.attachments : [];

        return {
          id,
          date: dateIso,
          type,
          description,
          cost: Number.isFinite(cost) ? cost : 0,
          status,
          notes,
          attachments,
        } as MaintenanceRecord;
      })
      .filter((item): item is MaintenanceRecord => Boolean(item));
  }

  private refreshMaintenanceSelection(planId?: string | null): void {
    if (!this.maintenanceModuleOpen()) {
      return;
    }

    const pending = this.pendingMaintenancePlans();
    let next: ConsultantPlan | null = null;

    if (planId) {
      next = pending.find(item => item.id === planId) ?? null;
    }

    if (!next) {
      const current = this.maintenanceSelectedPlan();
      if (current) {
        next = pending.find(item => item.id === current.id) ?? null;
      }
    }

    if (!next) {
      next = pending[0] ?? null;
    }

    if (!next) {
      this.maintenanceSelectedPlan.set(null);
      this.maintenanceModuleOpen.set(false);
      this.notificationService.push('All recorded assets are up to date for maintenance.', { type: 'success' });
      return;
    }

    this.maintenanceSelectedPlan.set(next);
    this.hydrateMaintenanceForm(next);
  }

  private toDateInputValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = String(value).trim();
    if (!text) {
      return '';
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toISOString().slice(0, 10);
  }

  private toNumberInputValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    const text = String(value).trim();
    if (!text) {
      return '';
    }
    const numeric = Number(text);
    return Number.isFinite(numeric) ? String(numeric) : '';
  }

  private normaliseExpectedLifespanInput(value: unknown): number | null {
    return this.normaliseNumericInput(value, { min: 0 });
  }

  private normaliseNumericInput(value: unknown, options?: { min?: number; max?: number }): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const numeric = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    if (options?.min !== undefined && numeric < options.min) {
      return null;
    }
    if (options?.max !== undefined && numeric > options.max) {
      return null;
    }
    return numeric;
  }

  private normaliseTextInput(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const text = typeof value === 'string' ? value : String(value);
    const trimmed = text.trim();
    return trimmed ? trimmed : null;
  }

  private normaliseOperationalData(value: unknown): OperationalSnapshot | null {
    if (!value || typeof value !== 'object') {
      return null;
    }
    const snapshot: OperationalSnapshot = {};
    const hours = this.normaliseNumericInput((value as any)['averageDailyRunHours'], { min: 0 });
    if (hours !== null) {
      snapshot.averageDailyRunHours = hours;
    }
    const availability = this.normaliseNumericInput((value as any)['availabilityPercent'], { min: 0, max: 100 });
    if (availability !== null) {
      snapshot.availabilityPercent = availability;
    }
    const lastInspectionRaw = (value as any)['lastInspectionDate'];
    if (lastInspectionRaw) {
      const text = String(lastInspectionRaw).trim();
      if (text) {
        snapshot.lastInspectionDate = text;
      }
    }
    const notes = (value as any)['operationalNotes'];
    if (typeof notes === 'string' && notes.trim()) {
      snapshot.operationalNotes = notes.trim();
    }
    const bulkMeter = this.normaliseNumericInput((value as any)['bulkMeterReadingProduction'], { min: 0 });
    if (bulkMeter !== null) {
      snapshot.bulkMeterReadingProduction = bulkMeter;
    }
    const bulkAttachment = this.normaliseTextInput((value as any)['bulkMeterAttachment']);
    if (bulkAttachment) {
      snapshot.bulkMeterAttachment = bulkAttachment;
    }
    const energySub = this.normaliseNumericInput((value as any)['energyConsumptionSubMeter'], { min: 0 });
    if (energySub !== null) {
      snapshot.energyConsumptionSubMeter = energySub;
    }
    const unitsImport = this.normaliseNumericInput((value as any)['unitsImportKwh'], { min: 0 });
    if (unitsImport !== null) {
      snapshot.unitsImportKwh = unitsImport;
    }
    const unitsExport = this.normaliseNumericInput((value as any)['unitsExportKwh'], { min: 0 });
    if (unitsExport !== null) {
      snapshot.unitsExportKwh = unitsExport;
    }
    const powerSource = this.normaliseTextInput((value as any)['powerSource']);
    if (powerSource) {
      snapshot.powerSource = powerSource;
    }
    const vfd = this.normaliseNumericInput((value as any)['vfdProductionKw'], { min: 0 });
    if (vfd !== null) {
      snapshot.vfdProductionKw = vfd;
    }
    const inverter = this.normaliseNumericInput((value as any)['inverterProductionKw'], { min: 0 });
    if (inverter !== null) {
      snapshot.inverterProductionKw = inverter;
    }
    return Object.keys(snapshot).length ? snapshot : null;
  }

  private normaliseOperationalHistory(value: unknown): OperationalSnapshotHistoryEntry[] {
    if (!Array.isArray(value) || !value.length) {
      return [];
    }
    const history: OperationalSnapshotHistoryEntry[] = [];
    value.forEach(entry => {
      if (!entry) {
        return;
      }
      const rawSnapshot = (entry as any).snapshot ?? (entry as any).data ?? (entry as any).operationalData ?? entry;
      const snapshot = this.normaliseOperationalData(rawSnapshot);
      if (!snapshot) {
        return;
      }
      const capturedRaw = (entry as any).capturedAt ?? (entry as any).recordedAt ?? (entry as any).timestamp ?? null;
      const capturedIso = this.toIsoDateString(capturedRaw) ?? new Date().toISOString();
      history.push({ capturedAt: capturedIso, snapshot });
    });
    history.sort((a, b) => {
      const aTime = this.safeParseDate(a.capturedAt)?.getTime() ?? 0;
      const bTime = this.safeParseDate(b.capturedAt)?.getTime() ?? 0;
      return aTime - bTime;
    });
    if (history.length > OPERATIONAL_HISTORY_LIMIT) {
      return history.slice(history.length - OPERATIONAL_HISTORY_LIMIT);
    }
    return history;
  }

  private normaliseOhrRecurringHistory(source: unknown): OhrRecurringHistoryEntry[] {
    if (!Array.isArray(source) || !source.length) {
      return [];
    }
    const config = this.resolveAssetForm('overhead-reservoir');
    const fieldLookup = new Map<string, AssetFieldConfig>();
    (config?.fields ?? []).forEach(field => {
      if (field.attributeKey) {
        fieldLookup.set(field.attributeKey, field);
      }
    });
    const allowedKeys = new Set(
      Array.from(fieldLookup.values())
        .filter(field => this.isRecurringField(field) && field.attributeKey)
        .map(field => field.attributeKey as string)
    );
    if (!allowedKeys.size) {
      return [];
    }

    const history: OhrRecurringHistoryEntry[] = [];
    source.forEach(entry => {
      if (!entry) {
        return;
      }
      const rawValues = (entry as any).values ?? entry;
      if (!rawValues || typeof rawValues !== 'object') {
        return;
      }
      const capturedAt = this.toIsoDateString((entry as any).capturedAt ?? (entry as any).timestamp ?? null);
      if (!capturedAt) {
        return;
      }
      const values: Record<string, number | string> = {};
      Object.entries(rawValues).forEach(([key, rawValue]) => {
        if (!allowedKeys.has(key)) {
          return;
        }
        const field = fieldLookup.get(key);
        if (!field) {
          return;
        }
        if (field.type === 'number') {
          const numeric = Number(rawValue);
          if (Number.isFinite(numeric)) {
            values[key] = numeric;
          }
          return;
        }
        const text = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue ?? '').trim();
        if (text) {
          values[key] = text;
        }
      });
      if (!Object.keys(values).length) {
        return;
      }
      history.push({ capturedAt, values });
    });

    history.sort((a, b) => {
      const aTime = this.safeParseDate(a.capturedAt)?.getTime() ?? 0;
      const bTime = this.safeParseDate(b.capturedAt)?.getTime() ?? 0;
      return aTime - bTime;
    });
    if (history.length > OHR_RECURRING_HISTORY_LIMIT) {
      return history.slice(history.length - OHR_RECURRING_HISTORY_LIMIT);
    }
    return history;
  }

  private recurringEntriesEqual(a: Record<string, number | string>, b: Record<string, number | string>): boolean {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    if (!keys.size) {
      return true;
    }
    for (const key of keys) {
      if (a[key] !== b[key]) {
        return false;
      }
    }
    return true;
  }

  private snapshotsEqual(a: OperationalSnapshot | null | undefined, b: OperationalSnapshot | null | undefined): boolean {
    if (!a && !b) {
      return true;
    }
    if (!a || !b) {
      return false;
    }
    return OPERATIONAL_SNAPSHOT_KEYS.every(key => {
      const left = (a as any)[key];
      const right = (b as any)[key];
      return left === right;
    });
  }

  private buildAttributes(raw: Record<string, any>, recurringAttachment?: ConsultantPlanAttachment | null): Record<string, any> | null {
    const attributes: Record<string, any> = {};
    const assetTypeValue = raw['assetType'];
    if (raw['notes']) {
      attributes['notes'] = raw['notes'];
    }

    // Add lifecycle information fields
    const commissioningDate = raw['commissioningDate'] ? String(raw['commissioningDate']).trim() : '';
    if (commissioningDate) {
      attributes['commissioningDate'] = commissioningDate;
    }

    const nextMaintenanceDate = raw['nextMaintenanceDate'] ? String(raw['nextMaintenanceDate']).trim() : '';
    if (nextMaintenanceDate) {
      attributes['nextMaintenanceDate'] = nextMaintenanceDate;
    }

    const expectedLifespan = this.normaliseExpectedLifespanInput(raw['expectedLifespanYears']);
    if (expectedLifespan !== null) {
      attributes['expectedLifespanYears'] = expectedLifespan;
    }

    const existingPlan = this.selectedPlan();
    const priorOperationalSnapshot = existingPlan
      ? this.normaliseOperationalData(existingPlan.operationalData ?? existingPlan.attributes?.['operationalData'])
      : null;
    const previousHistory = existingPlan
      ? [...(existingPlan.operationalSnapshotHistory ?? this.normaliseOperationalHistory(existingPlan.attributes?.['operationalSnapshotHistory']))]
      : [];

    const specPartition = this.collectAssetSpecifications(assetTypeValue);
    Object.assign(attributes, specPartition.combined);
    const ohrRecurringValues = assetTypeValue === 'overhead-reservoir' ? { ...specPartition.recurring } : null;
    if (raw['attributesJson']) {
      try {
        const parsed = JSON.parse(raw['attributesJson']);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if ('operationalData' in parsed) {
            delete (parsed as any)['operationalData'];
          }
          if ('operationalSnapshotHistory' in parsed) {
            delete (parsed as any)['operationalSnapshotHistory'];
          }
          if ('ohrRecurringHistory' in parsed) {
            delete (parsed as any)['ohrRecurringHistory'];
          }
          Object.assign(attributes, parsed);
        }
      } catch (err) {
        return null;
      }
    }
    const coords = this.currentCoordinates();
    if (coords) {
      if (attributes['latitude'] === undefined) {
        attributes['latitude'] = Number(coords.lat.toFixed(6));
      }
      if (attributes['longitude'] === undefined) {
        attributes['longitude'] = Number(coords.lng.toFixed(6));
      }
    }
    if (priorOperationalSnapshot) {
      attributes['operationalData'] = priorOperationalSnapshot;
    } else {
      delete attributes['operationalData'];
    }
    if (previousHistory.length) {
      attributes['operationalSnapshotHistory'] = previousHistory;
    } else {
      delete attributes['operationalSnapshotHistory'];
    }

    if (assetTypeValue === 'overhead-reservoir') {
      const priorRecurringHistory = existingPlan
        ? [...(existingPlan.ohrRecurringHistory ?? this.normaliseOhrRecurringHistory(existingPlan.attributes?.['ohrRecurringHistory']))]
        : [];
      if (ohrRecurringValues && Object.keys(ohrRecurringValues).length) {
        const capturedAt = new Date().toISOString();
        const lastIndex = priorRecurringHistory.length - 1;
        const lastEntry = lastIndex >= 0 ? priorRecurringHistory[lastIndex] : null;
        const nextValues = { ...ohrRecurringValues };
        const replacementAttachment = recurringAttachment ?? lastEntry?.attachment ?? null;
        if (lastEntry && this.recurringEntriesEqual(lastEntry.values, nextValues)) {
          priorRecurringHistory[lastIndex] = { capturedAt, values: nextValues, attachment: replacementAttachment };
        } else {
          priorRecurringHistory.push({ capturedAt, values: nextValues, attachment: recurringAttachment ?? null });
        }
      }
      if (priorRecurringHistory.length > OHR_RECURRING_HISTORY_LIMIT) {
        priorRecurringHistory.splice(0, priorRecurringHistory.length - OHR_RECURRING_HISTORY_LIMIT);
      }
      if (priorRecurringHistory.length) {
        attributes['ohrRecurringHistory'] = priorRecurringHistory;
      } else {
        delete attributes['ohrRecurringHistory'];
      }
    } else {
      delete attributes['ohrRecurringHistory'];
    }
    return attributes;
  }

  private decorateFeature(feature: Feature, raw: Record<string, any>, assetDef: AssetDefinition, forcedLayerName?: string): Feature {
    const cloned: Feature = {
      type: 'Feature',
      geometry: cloneGeometry(feature.geometry),
      properties: {
        ...(feature.properties || {}),
        title: raw['title'],
        description: raw['description'],
        layerName: forcedLayerName || this.deriveLayerName(feature, assetDef),
        assetType: assetDef.label,
        assetValue: assetDef.value,
        category: assetDef.category
      }
    };
    const coords = this.extractPointCoordinates(cloned);
    if (coords) {
      cloned.properties = {
        ...cloned.properties,
        coordinates: coords
      };
    }
    return cloned;
  }

  private getActiveFeature(): Feature | null {
    const draft = this.draftFeature();
    if (draft) {
      return draft;
    }
    const selected = this.selectedPlan();
    return selected?.feature ?? null;
  }

  private loadDefinitions(): void {
    this.plansService.getDefinitions().subscribe({
      next: defs => {
        if (Array.isArray(defs) && defs.length) {
          this.assetDefinitions.set(defs as AssetDefinition[]);
        }
      },
      error: () => {
        this.assetDefinitions.set(FALLBACK_DEFINITIONS);
      }
    });
  }

  private loadPlans(): void {
    this.loading.set(true);
    this.plansService.listPlans().subscribe({
      next: data => {
        this.loading.set(false);
        const plans = Array.isArray(data)
          ? data
              .map(item => this.normalisePlan(item))
              .filter((plan): plan is ConsultantPlan => Boolean(plan))
          : [];
        this.planList.set(plans);
        this.refreshMaintenanceSelection();
        this.startNewPlan();
        this.mapNeedsInitialFit = plans.length > 0;
        if (this.mapNeedsInitialFit) {
          this.scheduleMapFit();
        }
      },
      error: err => {
        this.loading.set(false);
        const message = err?.error?.msg || err?.message || 'Unable to load consultant plans.';
        this.notificationService.push(message, { type: 'critical' });
      }
    });
  }

  // Ensure the initial map view frames all known plans once data and the style are ready
  private scheduleMapFit(retries = 3): void {
    if (!this.planList().length) {
      this.mapNeedsInitialFit = false;
      return;
    }
    if (!this.mapNeedsInitialFit && retries === 3) {
      return;
    }

    const mapInstance = this.mapRef();
    const styleLoaded = typeof mapInstance?.isStyleLoaded === 'function' ? mapInstance.isStyleLoaded() : true;
    if (!mapInstance || !styleLoaded) {
      if (retries > 0) {
        setTimeout(() => this.scheduleMapFit(retries - 1), 250);
      }
      return;
    }

    requestAnimationFrame(() => {
      this.mapWorkspace?.fitToPlans();
      this.mapNeedsInitialFit = false;
    });
  }

  private loadEligibleSites(): void {
    this.requisitionsService.getRequisitions().subscribe({
      next: data => {
        const list = Array.isArray(data)
          ? data
              .filter(item => {
                const status = (item?.landAcquisition?.status || item?.status || '').toString().toLowerCase();
                return status === 'acquisition complete';
              })
              .map(item => ({
                id: item._id || item.id,
                title: item.title || 'Requisition',
                tehsil: item.tehsil || '',
                district: item.district || '',
                status: item.status || ''
              }))
          : [];
        list.sort((a, b) => a.title.localeCompare(b.title));
        this.availableSites.set(list);
        this.siteIndex.clear();
        list.forEach(site => this.siteIndex.set(site.id, site));
      },
      error: err => {
        const message = err?.error?.msg || err?.message || 'Unable to load acquisition sites.';
        console.warn(message);
      }
    });
  }

  private mergePlanIntoList(plan: ConsultantPlan): ConsultantPlan[] {
    const existing = this.planList();
    const index = existing.findIndex(item => item.id === plan.id);
    if (index >= 0) {
      const updated = [...existing];
      updated[index] = plan;
      return updated;
    }
    return [plan, ...existing];
  }

  private normalisePlan(source: any): ConsultantPlan | null {
    if (!source) {
      return null;
    }
    const id = extractId(source);
    if (!id) {
      return null;
    }
    const feature = this.toFeature(source.feature);
    const attributes = source.attributes && typeof source.attributes === 'object' ? { ...source.attributes } : {};
    const normalizeDateValue = (value: unknown): string | null => {
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
      }
      if (value === null || value === undefined) {
        return null;
      }
      const text = String(value).trim();
      return text || null;
    };
    const commissioningDate = normalizeDateValue(source.commissioningDate ?? attributes['commissioningDate']);
    const nextMaintenanceDate = normalizeDateValue(
      source.nextMaintenanceDate ?? attributes['nextMaintenanceDate'] ?? attributes['maintenanceDueDate'],
    );
    const expectedLifespanYears = this.normaliseExpectedLifespanInput(
      source.expectedLifespanYears ?? attributes['expectedLifespanYears'],
    );
    if (commissioningDate) {
      attributes['commissioningDate'] = commissioningDate;
    }
    if (nextMaintenanceDate) {
      attributes['nextMaintenanceDate'] = nextMaintenanceDate;
    }
    if (expectedLifespanYears !== null) {
      attributes['expectedLifespanYears'] = expectedLifespanYears;
    }
    const maintenanceHistory = this.normalizeMaintenanceHistory(
      source.maintenanceHistory ?? attributes['maintenanceHistory'],
    );
    if (maintenanceHistory.length) {
      attributes['maintenanceHistory'] = maintenanceHistory;
    } else {
      delete attributes['maintenanceHistory'];
    }
    const operationalData = this.normaliseOperationalData(source.operationalData ?? attributes['operationalData']);
    if (operationalData) {
      attributes['operationalData'] = operationalData;
    } else {
      delete attributes['operationalData'];
    }
    const operationalSnapshotHistory = this.normaliseOperationalHistory(
      source.operationalSnapshotHistory ?? attributes['operationalSnapshotHistory'],
    );
    if (operationalSnapshotHistory.length) {
      attributes['operationalSnapshotHistory'] = operationalSnapshotHistory;
    } else {
      delete attributes['operationalSnapshotHistory'];
    }
    const ohrRecurringHistory = this.normaliseOhrRecurringHistory(
      (source as any).ohrRecurringHistory ?? attributes['ohrRecurringHistory'],
    );
    if (ohrRecurringHistory.length) {
      attributes['ohrRecurringHistory'] = ohrRecurringHistory;
    } else {
      delete attributes['ohrRecurringHistory'];
    }
    return {
      id,
      title: source.title || source.assetLabel || 'Proposed Asset',
      assetType: source.assetType || '',
      assetLabel: source.assetLabel || source.assetType || '',
      category: source.category || 'Custom',
      layerName: source.layerName || LAYER_DEFAULT_NAME,
      description: source.description || '',
      requisitionId: extractId(source.requisitionId) || extractId(source.requisition),
      tehsil: source.tehsil || '',
      district: source.district || '',
      feature,
      coordinates: this.extractPointCoordinates(feature) ?? this.normaliseCoordinateInput((source as any)?.coordinates),
      attributes,
      commissioningDate,
      nextMaintenanceDate,
      expectedLifespanYears,
      maintenanceHistory,
      operationalData,
      operationalSnapshotHistory,
      ohrRecurringHistory,
      createdAt: source.createdAt || null,
      updatedAt: source.updatedAt || null
    };
  }

  private rebuildDefinitionIndex(definitions: AssetDefinition[]): void {
    this.assetDefinitionIndex.clear();
    definitions.forEach(def => {
      const key = def.value.toLowerCase();
      this.assetDefinitionIndex.set(key, def);
      this.assetDefinitionIndex.set(slugKey(def.value), def);
      this.assetDefinitionIndex.set(slugKey(def.label), def);
    });
  }

  private resolveAsset(raw: string | null | undefined): AssetDefinition | null {
    if (!raw) {
      return null;
    }
    const key = raw.toLowerCase();
    if (this.assetDefinitionIndex.has(key)) {
      return this.assetDefinitionIndex.get(key)!;
    }
    const slugged = slugKey(raw);
    if (slugged === 'other' && this.assetDefinitionIndex.has('custom-asset')) {
      return this.assetDefinitionIndex.get('custom-asset')!;
    }
    if (this.assetDefinitionIndex.has(slugged)) {
      return this.assetDefinitionIndex.get(slugged)!;
    }
    return null;
  }

  private classifyGeometry(feature: Feature | null): GeometryClass {
    const type = feature?.geometry?.type || '';
    if (!type) {
      return 'unknown';
    }
    if (type.includes('Line')) {
      return 'line';
    }
    if (type.includes('Point')) {
      return 'point';
    }
    if (type.includes('Polygon')) {
      return 'area';
    }
    return 'unknown';
  }

  private deriveLayerName(feature: Feature | null, assetDef: AssetDefinition | null = null): string {
    const classification = this.classifyGeometry(feature);
    if (classification === 'line') {
      return 'EDCS Pipelines';
    }
    if (classification === 'point') {
      return 'EDCS Pin Locations';
    }
    if (classification === 'area') {
      return 'EDCS Area Assets';
    }
    if (assetDef?.category === 'Water Supply') {
      return 'EDCS Water Assets';
    }
    if (assetDef?.category === 'Sewerage') {
      return 'EDCS Sewerage Assets';
    }
    return LAYER_DEFAULT_NAME;
  }

  private toFeature(geojson: any): Feature | null {
    if (!geojson) {
      return null;
    }
    if (geojson.type === 'FeatureCollection' && Array.isArray(geojson.features) && geojson.features.length) {
      return this.toFeature(geojson.features[0]);
    }
    if (geojson.type === 'Feature') {
      const feature: Feature = {
        type: 'Feature',
        geometry: cloneGeometry(geojson.geometry as Geometry),
        properties: geojson.properties && typeof geojson.properties === 'object' && !Array.isArray(geojson.properties)
          ? { ...geojson.properties }
          : {}
      };
      const coordsFromProps = this.normaliseCoordinateInput((feature.properties as any)?.coordinates);
      const coords = coordsFromProps ?? this.extractPointCoordinates(feature);
      if (coords) {
        feature.properties = {
          ...feature.properties,
          coordinates: coords
        };
      }
      return feature;
    }
    if (geojson.type && geojson.coordinates) {
      const feature: Feature = {
        type: 'Feature',
        geometry: {
          type: geojson.type,
          coordinates: geojson.coordinates
        } as Geometry,
        properties: {}
      };
      const coords = this.extractPointCoordinates(feature);
      if (coords) {
        feature.properties = { coordinates: coords };
      }
      return feature;
    }
    return null;
  }

  private updateDraftSummary(plan: ConsultantPlan | null = this.selectedPlan(), draft: Feature | null = this.draftFeature()): void {
    if (draft) {
      this.draftSummary.set(`Draft geometry ready (${draft.geometry?.type || 'Unknown'})`);
      return;
    }
    if (plan?.feature) {
      this.draftSummary.set(`Showing saved geometry for "${plan.title}".`);
      return;
    }
    this.draftSummary.set('Draw the infrastructure footprint on the map.');
  }

  private extractPointCoordinates(feature: Feature | null): PointCoordinates | null {
    if (!feature) {
      return null;
    }
    const fromProps = this.normaliseCoordinateInput((feature.properties as any)?.coordinates);
    if (fromProps) {
      return fromProps;
    }
    const coordinates = this.collectCoordinatePairs(feature.geometry ?? null);
    if (!coordinates.length) {
      return null;
    }
    let sumLat = 0;
    let sumLng = 0;
    coordinates.forEach(([lng, lat]) => {
      sumLat += lat;
      sumLng += lng;
    });
    const lat = sumLat / coordinates.length;
    const lng = sumLng / coordinates.length;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }

  private collectCoordinatePairs(geometry: Geometry | null | undefined): Array<[number, number]> {
    const pairs: Array<[number, number]> = [];
    if (!geometry) {
      return pairs;
    }

    const visitCoordinates = (value: any): void => {
      if (!Array.isArray(value)) {
        return;
      }
      if (value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
        const lng = Number(value[0]);
        const lat = Number(value[1]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          pairs.push([lng, lat]);
        }
        return;
      }
      value.forEach(visitCoordinates);
    };

    const visitGeometry = (geom: Geometry | null | undefined): void => {
      if (!geom) {
        return;
      }
      if (geom.type === 'GeometryCollection') {
        const nested = (geom as any).geometries as Geometry[] | undefined;
        nested?.forEach(entry => visitGeometry(entry));
        return;
      }
      visitCoordinates((geom as any).coordinates);
    };

    visitGeometry(geometry);
    return pairs;
  }

  private normaliseCoordinateInput(raw: any): PointCoordinates | null {
    if (raw === null || raw === undefined) {
      return null;
    }
    if (Array.isArray(raw)) {
      if (raw.length >= 2) {
        const first = Number(raw[0]);
        const second = Number(raw[1]);
        if (Number.isFinite(first) && Number.isFinite(second)) {
          if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
            return { lat: first, lng: second };
          }
          if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
            return { lat: second, lng: first };
          }
        }
      }
      for (const item of raw) {
        const candidate = this.normaliseCoordinateInput(item);
        if (candidate) {
          return candidate;
        }
      }
      return null;
    }
    if (typeof raw === 'string') {
      const parts = raw
        .split(/[,\s]+/)
        .map(piece => Number(piece.trim()))
        .filter(num => Number.isFinite(num));
      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];
        if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
          return { lat: first, lng: second };
        }
        if (Math.abs(first) <= 180 && Math.abs(second) <= 90) {
          return { lat: second, lng: first };
        }
      }
      return null;
    }
    if (typeof raw === 'object') {
      const latCandidates = [raw.lat, raw.latitude, raw.y, raw.latLng?.lat, raw.latlng?.lat];
      const lngCandidates = [raw.lng, raw.longitude, raw.lon, raw.long, raw.x, raw.latLng?.lng, raw.latlng?.lng];
      const lat = latCandidates.map(value => Number(value)).find(value => Number.isFinite(value));
      const lng = lngCandidates.map(value => Number(value)).find(value => Number.isFinite(value));
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat: lat as number, lng: lng as number };
      }
    }
    return null;
  }

  private serialiseAttributes(attributes: Record<string, any> | null | undefined): string {
    if (!attributes || typeof attributes !== 'object') {
      return '';
    }
    const clean = { ...attributes };
    delete clean['assetType'];
    delete clean['assetValue'];
    delete clean['category'];
    delete clean['layerName'];
    delete clean['operationalData'];
    delete clean['operationalSnapshotHistory'];
    delete clean['ohrRecurringHistory'];
    if (!Object.keys(clean).length) {
      return '';
    }
    try {
      return JSON.stringify(clean, null, 2);
    } catch {
      return '';
    }
  }

  onAssetSelected(asset: any): void {
    // Handle asset selection from map popup
    // This is called when a user clicks on an asset marker on the map
    console.log('Asset selected from map:', asset);

    // Optionally highlight the asset or show details
    // You can navigate to a detail view or open a modal here

    // Generate and download PDF report automatically (optional)
    if (asset && asset.id && asset.title) {
      try {
        this.pdfReportService.generateAssetReport(asset);
        this.notificationService.push(`PDF report generated for ${asset.title}`, { type: 'success' });
      } catch (error) {
        console.error('Failed to generate PDF report:', error);
        this.notificationService.push('Failed to generate PDF report', { type: 'critical' });
      }
    }
  }

  exportSelectedAssetPdf(): void {
    const plan = this.selectedPlan();
    if (!plan) {
      this.notificationService.push('Please select an asset first', { type: 'warning' });
      return;
    }

    try {
      this.pdfReportService.generateAssetReport({
        id: plan.id,
        title: plan.title,
        category: plan.category,
        assetType: plan.assetType,
        attributes: plan.attributes,
        commissioningDate: plan.attributes?.['commissioningDate'] ?? null,
        nextMaintenanceDate: this.resolveNextMaintenanceDate(plan.attributes),
        expectedLifespanYears: plan.attributes?.['expectedLifespanYears'] ?? null,
        maintenanceHistory: plan.attributes?.['maintenanceHistory'] ?? []
      });
      this.notificationService.push(`PDF report generated for ${plan.title}`, { type: 'success' });
    } catch (error) {
      console.error('Failed to generate PDF report:', error);
      this.notificationService.push('Failed to generate PDF report', { type: 'critical' });
    }
  }

  /**
   * Initialize asset layers on the map
   * Loads all existing assets and sets up layer configuration
   */
  private syncVisibleCategories(): void {
    const sub = this.assetLayerService.getLayerConfigs().subscribe(configs => {
      const active = new Set<string>();
      configs.forEach(config => {
        if (config.visible !== false) {
          active.add(config.category);
        }
      });
      this.visibleCategories.set(active);
    });
    this.subscriptions.push(sub);
  }

  private initializeAssetLayers(): void {
    // Load assets from the service
    this.assetLayerService.loadAssetsForMap().subscribe({
      next: (assetsMap) => {
        console.log('Assets loaded for mapping:', assetsMap.size, 'categories');
      },
      error: (err) => {
        console.error('Failed to load assets for layers:', err);
        this.notificationService.push('Failed to load asset layers', { type: 'warning' });
      }
    });
  }

  /**
   * Handle when map is ready and reference is available
   * Initialize MapLibre GL integration
   */
  onMapReady(map: any): void {
    if (map) {
      this.mapRef.set(map);
      // Initialize asset layers on the map
      this.mapLayerIntegrationService.initializeAssetLayers(map);
      console.log('Asset layers initialized on map');
      if (this.planList().length) {
        this.mapNeedsInitialFit = true;
        this.scheduleMapFit();
      }
    }
  }

  /**
   * Handle layer visibility toggle event from AssetLayerToggleComponent
   * @param event Layer toggle event with layerId and visible flag
   */
  onLayerToggled(event: { layerId: string; category: string; visible: boolean }): void {
    const map = this.mapRef();
    if (!map) {
      console.warn('Map reference not available for layer toggle');
      return;
    }

    this.mapLayerIntegrationService.toggleLayerVisibility(map, event.layerId, event.visible);
    console.log(`Layer ${event.layerId} visibility set to ${event.visible}`);

    const categories = new Set(this.visibleCategories());
    const category = (event.category || '').trim();
    if (category) {
      if (event.visible) {
        categories.add(category);
      } else {
        categories.delete(category);
      }
      this.visibleCategories.set(categories);
    }
  }

  /**
   * Handle collapse/expand state change for asset layer toggle
   * @param collapsed New collapse state
   */
  onAssetLayerCollapseChange(collapsed: boolean): void {
    this.assetLayerCollapsed.set(collapsed);
  }
}

function slugKey(value: string): string {
  return (value || '').toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function cloneFeature<T extends Feature | null | undefined>(feature: T): T {
  if (!feature || typeof feature !== 'object') {
    return feature;
  }
  try {
    return JSON.parse(JSON.stringify(feature));
  } catch {
    return feature;
  }
}

function cloneGeometry<T extends Geometry | null | undefined>(geometry: T): T {
  if (!geometry || typeof geometry !== 'object') {
    return geometry;
  }
  try {
    return JSON.parse(JSON.stringify(geometry));
  } catch {
    return geometry;
  }
}

function extractId(value: any): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (typeof value === 'object') {
    if (value._id) {
      return value._id.toString();
    }
    if (value.id) {
      return value.id.toString();
    }
  }
  return null;
}
