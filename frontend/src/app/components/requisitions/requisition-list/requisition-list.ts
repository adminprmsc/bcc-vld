import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequisitionsService } from '../requisitions.service';
import { RequisitionCreate } from '../requisition-create/requisition-create';
import { NotificationService } from '../../shared/notification.service';
import { MapWorkspaceComponent, MapWorkspacePlan, DrawMode } from '../../shared/maps/map-workspace.component';
import {
  GOVT_LAND_QUESTIONS,
  PRIVATE_LAND_QUESTIONS,
  type DueDiligenceQuestion
} from '../requisition-create/due-diligence-questions';
import { ActivatedRoute, Router } from '@angular/router';
import type { Feature } from 'geojson';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { environment } from '../../../../environments/environment';

const LAND_STATUS_OPTIONS = [
  'Identification Pending',
  'Document Collection',
  'Verification Scheduled',
  'Verification Complete',
  'Submitted for Approval',
  'Approved',
  'Acquisition Complete',
  'Rejected'
];

const LAND_TYPE_OPTIONS = ['Private Land', 'Govt Land'];

const WORKFLOW_STATUS_LABELS = {
  pendingDm: 'Pending DM Review',
  pendingBcc: 'Pending BCC Officer Review',
  pendingTm: 'Pending TM Review',
  pendingChief: 'Pending BCC Specialist Review',
  pendingWbDispatch: 'Pending WB Dispatch',
  pendingWbApproval: 'Pending WB Approval',
  wbApproved: 'WB Approved',
  markedToTm: 'Marked to TM',
  pendingBccClosure: 'Pending BCC Closure',
  closed: 'Closed'
} as const;

type WorkflowStatusKey = keyof typeof WORKFLOW_STATUS_LABELS;
type WorkflowStageState = 'upcoming' | 'active' | 'complete';

interface WorkflowStageView {
  key: WorkflowStatusKey;
  label: string;
  role: string;
  description: string;
  state: WorkflowStageState;
}

const WORKFLOW_STAGE_CONFIG: Array<{
  key: WorkflowStatusKey;
  role: string;
  description: string;
}> = [
  {
    key: 'pendingDm',
    role: 'DM · Tehsil DM',
    description: 'Initial scrutiny and validation at the tehsil development office.'
  },
  {
    key: 'pendingBcc',
    role: 'BCC Officer',
    description: 'BCC officer validates donor paperwork and prepares acquisition artefacts.'
  },
  {
    key: 'pendingTm',
    role: 'Tehsil Manager',
    description: 'Tehsil manager confirms readiness for escalations and ensures completeness.'
  },
  {
    key: 'pendingChief',
    role: 'BCC Specialist',
    description: 'BCC Specialist vets the dossier before it is dispatched to World Bank reviewers.'
  },
  {
    key: 'pendingWbDispatch',
    role: 'BCC Officer',
    description: 'Packaging is finalised for submission to World Bank counterparts.'
  },
  {
    key: 'pendingWbApproval',
    role: 'WB User',
    description: 'World Bank reviewer assesses compliance and issues the approval decision.'
  },
  {
    key: 'wbApproved',
    role: 'BCC Specialist',
    description: 'Approval received; BCC Specialist routes the case back for implementation.'
  },
  {
    key: 'markedToTm',
    role: 'Tehsil Manager',
    description: 'Tehsil manager prepares closing actions and field coordination.'
  },
  {
    key: 'pendingBccClosure',
    role: 'BCC Officer',
    description: 'BCC officer performs final reconciliation and uploads closure evidence.'
  },
  {
    key: 'closed',
    role: 'BCC Officer',
    description: 'Workflow completed and archived for reporting.'
  }
];

const LAND_STATUS_LOOKUP = new Set(
  [
    ...LAND_STATUS_OPTIONS,
    'Assigned to BCC',
    'Land Acquisition Updated',
    'Donor Data Uploaded',
    'Documentation Added'
  ].map(status => status.toLowerCase())
);

interface LandForm {
  type: string;
  status: string;
  donor: {
    fullName: string;
    cnic: string;
    contactNumber: string;
    address: string;
    villageName: string;
    tehsil: string;
    district: string;
  };
  land: {
    khasraNumber: string;
    area: string;
    landCategory: string;
    latitude: string;
    longitude: string;
    mutationNumber: string;
    currentUse: string;
  };
  donation: {
    donationType: string;
    purpose: string;
    willingnessDate: string;
    remarks: string;
  };
  verification: {
    verifiedBy: string;
    verifiedDate: string;
    approvedBy: string;
    approvalStatus: string;
  };
}

interface DueDiligenceEntry {
  id: string;
  prompt: string;
  response: string;
  helper?: string;
}

@Component({
  selector: 'app-requisition-list',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RequisitionCreate, MapWorkspaceComponent],
  templateUrl: './requisition-list.html',
  styleUrls: ['./requisition-list.scss']
})
export class RequisitionList {
  requisitions: any[] = [];
  selectedRequisition: any = null;
  workflowTimeline: WorkflowStageView[] = [];
  showCreateModal: boolean = false;
  currentUser: any = null;
  workflowRemarks: string = '';
  revertRemarks: string = '';
  revertStatus: string = '';
  readonly landStatusOptions = LAND_STATUS_OPTIONS;
  readonly landTypeOptions = LAND_TYPE_OPTIONS;
  landForm: LandForm = this.blankLandForm();
  landFormVisible: boolean = false;
  landSubmitting: boolean = false;
  landError: string = '';
  landExistingDocs: string[] = [];
  landKeepAttachmentMap: Record<string, boolean> = {};
  landNewDocuments: File[] = [];
  ownershipProofFile: File | null = null;
  ownershipProofName: string | null = null;
  mapPlans: MapWorkspacePlan[] = [];
  mapHighlightedPlanId: string | null = null;
  mapDraftFeature: Feature | null = null;
  mapDraftSummary = 'Draw the infrastructure footprint on the map.';
  mapViewport: { center: { lat: number; lng: number }; zoom: number } | null = null;
  mapMarker: { lat: number; lng: number } | null = null;
  mapDraftDirty = false;
  mapEditing = false;
  mapSaving = false;
  mapError = '';
  readonly govtDueDiligenceQuestions = GOVT_LAND_QUESTIONS;
  readonly privateDueDiligenceQuestions = PRIVATE_LAND_QUESTIONS;
  dueDiligenceGovtEntries: DueDiligenceEntry[] = [];
  dueDiligencePrivateEntries: DueDiligenceEntry[] = [];
  private mapFeatureBuffer: Feature[] = [];
  private readonly uploadsBaseUrl = `${environment.uploadsBaseUrl}/`;
  downloadingPdf = false;
  downloadingDueDiligence = false;
  private readonly workflowStatus = WORKFLOW_STATUS_LABELS;
  readonly revertTargets: string[] = WORKFLOW_STAGE_CONFIG.map(stage => WORKFLOW_STATUS_LABELS[stage.key]);
  private requisitionsService = inject(RequisitionsService);
  private notificationService = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pendingSelectionId: string | null = null;
  @ViewChild('ownershipProofInput') private ownershipProofInput?: ElementRef<HTMLInputElement>;
  @ViewChild('landDocumentsInput') private landDocumentsInput?: ElementRef<HTMLInputElement>;
  @ViewChild('detailWorkspace') private detailWorkspace?: MapWorkspaceComponent;
  private mapInstance: MapLibreMap | null = null;

  constructor() {
    document.addEventListener('keydown', this.handleEscape.bind(this));
    // Get current user from localStorage or AuthService
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
    }
  }

  private blankLandForm(): LandForm {
    return {
      type: 'Private Land',
      status: '',
      donor: {
        fullName: '',
        cnic: '',
        contactNumber: '',
        address: '',
        villageName: '',
        tehsil: '',
        district: ''
      },
      land: {
        khasraNumber: '',
        area: '',
        landCategory: '',
        latitude: '',
        longitude: '',
        mutationNumber: '',
        currentUse: ''
      },
      donation: {
        donationType: '',
        purpose: '',
        willingnessDate: '',
        remarks: ''
      },
      verification: {
        verifiedBy: '',
        verifiedDate: '',
        approvedBy: '',
        approvalStatus: ''
      }
    };
  }

  private initLandForm(source: any | null): void {
    if (!source) {
      this.landForm = this.blankLandForm();
      this.landExistingDocs = [];
      this.landKeepAttachmentMap = {};
      this.landNewDocuments = [];
      this.ownershipProofFile = null;
      this.ownershipProofName = null;
      this.landError = '';
      this.resetLandFileInputs();
      return;
    }

    const land = source.landAcquisition || {};
    const donor = land.donor || {};
    const landDetails = land.land || {};
    const donation = land.donation || {};
    const verification = land.verification || {};

    this.landForm = {
      type: land.type || source.landType || 'Private Land',
      status: land.status || '',
      donor: {
        fullName: donor.fullName || '',
        cnic: donor.cnic || '',
        contactNumber: donor.contactNumber || '',
        address: donor.address || '',
        villageName: donor.villageName || '',
        tehsil: donor.tehsil || '',
        district: donor.district || ''
      },
      land: {
        khasraNumber: landDetails.khasraNumber || '',
        area: landDetails.area || '',
        landCategory: landDetails.landCategory || '',
        latitude: this.formatNumberInput(landDetails.latitude),
        longitude: this.formatNumberInput(landDetails.longitude),
        mutationNumber: landDetails.mutationNumber || '',
        currentUse: landDetails.currentUse || ''
      },
      donation: {
        donationType: donation.donationType || '',
        purpose: donation.purpose || '',
        willingnessDate: this.toDateInputValue(donation.willingnessDate),
        remarks: donation.remarks || ''
      },
      verification: {
        verifiedBy: verification.verifiedBy || '',
        verifiedDate: this.toDateInputValue(verification.verifiedDate),
        approvedBy: verification.approvedBy || '',
        approvalStatus: verification.approvalStatus || ''
      }
    };

    this.landExistingDocs = Array.isArray(donation.attachedDocuments) ? [...donation.attachedDocuments] : [];
    this.landKeepAttachmentMap = this.landExistingDocs.reduce<Record<string, boolean>>((acc, name) => {
      acc[name] = true;
      return acc;
    }, {});
    this.landNewDocuments = [];
    this.ownershipProofFile = null;
    this.ownershipProofName = null;
    this.landError = '';
    this.resetLandFileInputs();
  }

  private toDateInputValue(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value as any);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString().split('T')[0];
  }

  private formatDateForExport(value: unknown): string {
    if (!value) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value as any);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const iso = date.toISOString();
    return iso.slice(0, 19).replace('T', ' ');
  }

  private escapeForExcel(value: unknown): string {
    const text = (value ?? '').toString();
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\r?\n/g, '<br/>');
  }

  private formatNumberInput(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }
    const text = `${value}`.trim();
    return text === 'NaN' ? '' : text;
  }

  private clean(value: unknown): string {
    return (value ?? '').toString().trim();
  }

  private resetLandFileInputs(): void {
    if (this.ownershipProofInput?.nativeElement) {
      this.ownershipProofInput.nativeElement.value = '';
    }
    if (this.landDocumentsInput?.nativeElement) {
      this.landDocumentsInput.nativeElement.value = '';
    }
  }

  private normalizeStatusLabel(status: string | null | undefined): string {
    return (status ?? '').toString().trim().toLowerCase();
  }

  private resolveWorkflowStageIndex(status: string | null | undefined): number {
    const normalized = this.normalizeStatusLabel(status);
    if (!normalized) {
      return -1;
    }
    const directIndex = WORKFLOW_STAGE_CONFIG.findIndex(
      stage => this.normalizeStatusLabel(WORKFLOW_STATUS_LABELS[stage.key]) === normalized
    );
    if (directIndex >= 0) {
      return directIndex;
    }
    if (LAND_STATUS_LOOKUP.has(normalized)) {
      return WORKFLOW_STAGE_CONFIG.findIndex(stage => stage.key === 'pendingBcc');
    }
    return -1;
  }

  private updateWorkflowTimeline(status: string | null | undefined): void {
    if (!this.selectedRequisition) {
      this.workflowTimeline = [];
      return;
    }
    const activeIndex = this.resolveWorkflowStageIndex(status);
    this.workflowTimeline = WORKFLOW_STAGE_CONFIG.map((stage, index) => {
      let state: WorkflowStageState = 'upcoming';
      if (activeIndex >= 0) {
        if (index < activeIndex) {
          state = 'complete';
        } else if (index === activeIndex) {
          state = 'active';
        }
      }
      return {
        ...stage,
        label: WORKFLOW_STATUS_LABELS[stage.key],
        state
      };
    });
  }

  displayAssignedTo(requisition: any | null): string {
    if (!requisition?.assignedTo) {
      return 'Unassigned';
    }
    const target = requisition.assignedTo;
    if (typeof target === 'string') {
      return target;
    }
    return target.name || target.email || target.username || 'Unassigned';
  }

  onLogout() {
    // Clear all auth data and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  onUpdateProfile() {
    // Open self user update modal or navigate to profile page
    // Implement as needed
    alert('Profile update coming soon!');
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleEscape.bind(this));
    this.mapInstance = null;
  }

  toggleLandForm() {
    if (!this.selectedRequisition) {
      return;
    }
    if (!this.landFormVisible) {
      this.initLandForm(this.selectedRequisition);
    }
    this.landError = '';
    this.landFormVisible = !this.landFormVisible;
  }

  cancelLandForm() {
    if (this.selectedRequisition) {
      this.initLandForm(this.selectedRequisition);
    } else {
      this.initLandForm(null);
    }
    this.landFormVisible = false;
  }

  handleKeepAttachmentToggle(name: string, keep: boolean) {
    this.landKeepAttachmentMap = {
      ...this.landKeepAttachmentMap,
      [name]: keep
    };
  }

  onOwnershipProofSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length ? input.files[0] : null;
    this.ownershipProofFile = file;
    this.ownershipProofName = file ? file.name : null;
  }

  clearOwnershipProofSelection() {
    this.ownershipProofFile = null;
    this.ownershipProofName = null;
    if (this.ownershipProofInput?.nativeElement) {
      this.ownershipProofInput.nativeElement.value = '';
    }
  }

  onLandDocumentsSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    if (files.length) {
      this.landNewDocuments = [...this.landNewDocuments, ...files];
    }
    if (this.landDocumentsInput?.nativeElement) {
      this.landDocumentsInput.nativeElement.value = '';
    }
  }

  removeNewDocument(index: number) {
    if (index < 0 || index >= this.landNewDocuments.length) {
      return;
    }
    this.landNewDocuments = this.landNewDocuments.filter((_, idx) => idx !== index);
  }

  submitLandAcquisition() {
    if (!this.selectedRequisition) {
      this.landError = 'No requisition selected.';
      return;
    }

    this.landError = '';
    const stage = this.clean(this.landForm.status);
    if (!stage) {
      this.landError = 'Please select the current land acquisition stage.';
      return;
    }

    const donorDetails = {
      fullName: this.clean(this.landForm.donor.fullName),
      cnic: this.clean(this.landForm.donor.cnic),
      contactNumber: this.clean(this.landForm.donor.contactNumber),
      address: this.clean(this.landForm.donor.address),
      villageName: this.clean(this.landForm.donor.villageName),
      tehsil: this.clean(this.landForm.donor.tehsil),
      district: this.clean(this.landForm.donor.district)
    };

    const landDetails = {
      khasraNumber: this.clean(this.landForm.land.khasraNumber),
      area: this.clean(this.landForm.land.area),
      landCategory: this.clean(this.landForm.land.landCategory),
      latitude: this.clean(this.landForm.land.latitude),
      longitude: this.clean(this.landForm.land.longitude),
      mutationNumber: this.clean(this.landForm.land.mutationNumber),
      currentUse: this.clean(this.landForm.land.currentUse)
    };

    const donationDetails = {
      donationType: this.clean(this.landForm.donation.donationType),
      purpose: this.clean(this.landForm.donation.purpose),
      willingnessDate: this.clean(this.landForm.donation.willingnessDate),
      remarks: this.clean(this.landForm.donation.remarks)
    };

    const verificationDetails = {
      verifiedBy: this.clean(this.landForm.verification.verifiedBy),
      verifiedDate: this.clean(this.landForm.verification.verifiedDate),
      approvedBy: this.clean(this.landForm.verification.approvedBy),
      approvalStatus: this.clean(this.landForm.verification.approvalStatus)
    };

    const keepAttachments = Object.entries(this.landKeepAttachmentMap)
      .filter(([, keep]) => !!keep)
      .map(([name]) => name);

    this.landSubmitting = true;

    this.requisitionsService
      .updateLandAcquisition(this.selectedRequisition._id, {
        type: this.clean(this.landForm.type) || 'Private Land',
        status: stage,
        donorDetails,
        landDetails,
        donationDetails,
        verification: verificationDetails,
        keepAttachments,
        ownershipProof: this.ownershipProofFile || undefined,
        attachedDocuments: this.landNewDocuments
      })
      .subscribe({
        next: res => {
          this.landSubmitting = false;
          const normalized = this.normalizeRequisition(res);
          this.selectedRequisition = normalized;
          this.initLandForm(normalized);
          this.landFormVisible = false;
          this.notificationService.push('Land acquisition details updated', {
            type: 'success',
            context: { requisitionId: normalized?._id }
          });
          this.refreshList();
        },
        error: err => {
          this.landSubmitting = false;
          this.landError = err?.error?.msg || err?.message || 'Unable to save land acquisition details.';
        }
      });
  }

  markLandAcquisitionComplete(): void {
    if (!this.selectedRequisition || !this.canMarkLandAcquisitionComplete(this.selectedRequisition)) {
      return;
    }
    this.landForm = {
      ...this.landForm,
      status: 'Acquisition Complete'
    };
    this.submitLandAcquisition();
  }

  handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.selectedRequisition) {
        this.closeModal();
      }
      if (this.showCreateModal) {
        this.closeCreateModal();
      }
    }
  }

  openCreateModal() {
    this.showCreateModal = true;
  }

  // Accept optional created requisition so parent can update list immediately
  closeCreateModal(created?: any) {
    this.showCreateModal = false;
    if (created) {
      // Prepend the newly created requisition so it's visible immediately
      this.requisitions = [created, ...this.requisitions];
      this.notificationService.push('Requisition created successfully', {
        type: 'success',
        context: { requisitionId: created?._id }
      });
    }
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const targetId = params.get('id');
      this.pendingSelectionId = targetId;
      if (targetId && this.requisitions.length) {
        this.trySelectPending(targetId);
      }
    });

    this.requisitionsService.getRequisitions().subscribe((data: any) => {
      this.requisitions = Array.isArray(data) ? data.map(item => this.normalizeRequisition(item)) : [];
      if (this.pendingSelectionId) {
        this.trySelectPending(this.pendingSelectionId);
      }
    });
  }

  viewRequisition(req: any) {
    this.workflowRemarks = '';
    this.revertRemarks = '';
    this.revertStatus = '';
    const id = req?._id;
    if (!id) {
      alert('Missing requisition identifier.');
      return;
    }
    this.requisitionsService.getRequisitionById(id).subscribe({
      next: detail => {
        const normalized = this.normalizeRequisition(detail);
        this.selectedRequisition = normalized;
        this.updateWorkflowTimeline(normalized?.status);
        this.landFormVisible = false;
        this.initLandForm(normalized);
        this.refreshDueDiligencePanels(normalized);
        this.initializeMapEditor(normalized);
      },
      error: err => {
        alert('Unable to load requisition details: ' + (err?.error?.msg || err?.message || 'Unknown error'));
      }
    });
  }

  private normalizeRequisition(req: any) {
    if (!req) {
      return req;
    }
    const toDate = (value: any) => {
      if (!value) {
        return null;
      }
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const breadth = Number(req.landBreadth) || 0;
    const depth = Number(req.landDepth) || 0;
    const areaSqFt = Number(req.calculatedAreaSqFt) || (breadth && depth ? breadth * depth : 0);
    const areaMarlas = Number(req.calculatedAreaMarlas) || (areaSqFt ? Number((areaSqFt / 272.25).toFixed(2)) : 0);
    const areaKanals = Number(req.calculatedAreaKanals) || (areaSqFt ? Number((areaSqFt / 5445).toFixed(2)) : 0);
    const normalizedLocation = this.normalizeLocation(req?.location);
    const assignedToId = this.extractId(req?.assignedTo);
    const requestedById = this.extractId(req?.requestedBy);
    const mapFeatures = this.extractMapFeatures(req?.mapFeatures);
    const markerCoords = this.normalizeCoordinates(
      req?.mapMarker || normalizedLocation?.coordinates || req?.location || null
    );
    const mapViewport = this.normalizeViewportPayload(req?.mapViewport, markerCoords);
    const landAcquisition = req.landAcquisition
      ? {
          ...req.landAcquisition,
          donor: { ...(req.landAcquisition.donor || {}) },
          land: { ...(req.landAcquisition.land || {}) },
          donation: {
            ...(req.landAcquisition.donation || {}),
            willingnessDate: toDate(req.landAcquisition.donation?.willingnessDate),
            attachedDocuments: Array.isArray(req.landAcquisition.donation?.attachedDocuments)
              ? [...req.landAcquisition.donation.attachedDocuments]
              : []
          },
          verification: {
            ...(req.landAcquisition.verification || {}),
            verifiedDate: toDate(req.landAcquisition.verification?.verifiedDate)
          },
          updatedAt: toDate(req.landAcquisition.updatedAt),
          updatedBy: req.landAcquisition.updatedBy || null
        }
      : null;
    return {
      ...req,
      landBreadth: breadth,
      landDepth: depth,
      calculatedAreaSqFt: areaSqFt,
      calculatedAreaMarlas: areaMarlas,
      calculatedAreaKanals: areaKanals,
      requiredDate: req.requiredDate ? new Date(req.requiredDate) : null,
      location: normalizedLocation,
      mapFeatures,
      mapMarker: markerCoords,
      mapViewport,
      supportingDocs: Array.isArray(req.supportingDocs)
        ? req.supportingDocs
        : req.supportingDocs
        ? [req.supportingDocs]
        : [],
      attachments: Array.isArray(req.attachments)
        ? req.attachments
        : req.attachments
        ? [req.attachments]
        : [],
      assignedToId,
      requestedById,
      landAcquisition
    };
  }

  private refreshDueDiligencePanels(req: any): void {
    this.dueDiligenceGovtEntries = this.buildDueDiligenceEntries(
      this.sanitizeChecklistPayload(req?.govtLandChecklist),
      this.govtDueDiligenceQuestions
    );
    this.dueDiligencePrivateEntries = this.buildDueDiligenceEntries(
      this.sanitizeChecklistPayload(req?.privateLandChecklist),
      this.privateDueDiligenceQuestions
    );
  }

  private sanitizeChecklistPayload(source: any): Record<string, string> {
    if (!source) {
      return {};
    }
    let parsed = source;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return {};
      }
    }
    const accumulator: Record<string, string> = {};
    const insertEntry = (keyCandidate: unknown, valueCandidate: unknown) => {
      const normalizedKey = (keyCandidate ?? '').toString().trim();
      if (!normalizedKey) {
        return;
      }
      if (valueCandidate === null || valueCandidate === undefined) {
        return;
      }
      const normalizedValue = valueCandidate.toString().trim();
      if (!normalizedValue) {
        return;
      }
      accumulator[normalizedKey] = normalizedValue;
    };

    if (Array.isArray(parsed)) {
      parsed.forEach(entry => {
        if (Array.isArray(entry) && entry.length >= 2) {
          insertEntry(entry[0], entry[1]);
          return;
        }
        if (entry && typeof entry === 'object') {
          const keyCandidate = (entry as any).id ?? (entry as any).key ?? (entry as any).questionId ?? '';
          const valueCandidate =
            (entry as any).response ?? (entry as any).value ?? (entry as any).answer ?? (entry as any).text;
          insertEntry(keyCandidate, valueCandidate);
        }
      });
      return accumulator;
    }

    if (typeof parsed === 'object') {
      Object.entries(parsed).forEach(([key, value]) => insertEntry(key, value));
      return accumulator;
    }

    return {};
  }

  private buildDueDiligenceEntries(
    checklist: Record<string, string>,
    questions: DueDiligenceQuestion[]
  ): DueDiligenceEntry[] {
    if (!checklist || !questions?.length) {
      return [];
    }
    const lookup = questions.reduce<Record<string, DueDiligenceQuestion>>((acc, question) => {
      acc[question.id] = question;
      return acc;
    }, {});
    const ordered: DueDiligenceEntry[] = [];
    questions.forEach(question => {
      const response = checklist[question.id];
      if (response) {
        ordered.push({
          id: question.id,
          prompt: question.prompt,
          response,
          helper: question.helper
        });
      }
    });
    Object.keys(checklist)
      .filter(id => !lookup[id])
      .forEach(id => {
        ordered.push({
          id,
          prompt: `Response for ${id}`,
          response: checklist[id]
        });
      });
    return ordered;
  }

  private normalizeLocation(location: any) {
    if (!location) {
      return location;
    }
    const normalized: any = typeof location === 'object' && !Array.isArray(location) ? { ...location } : {};
    if (typeof location === 'string') {
      normalized.address = location;
    }
    const coords = this.normalizeCoordinates((location as any).coordinates || (location as any).coords || location);
    if (coords) {
      normalized.coordinates = coords;
      normalized.coordinateString = this.formatCoordinates(coords);
    }
    return normalized;
  }

  private normalizeCoordinates(coords: any): { lat: number; lng: number } | null {
    if (!coords) {
      return null;
    }
    if (Array.isArray(coords)) {
      const lngFirst = Number(coords[0]);
      const latSecond = Number(coords[1]);
      if (Number.isFinite(latSecond) && Number.isFinite(lngFirst)) {
        return { lat: latSecond, lng: lngFirst };
      }
      const latFirst = Number(coords[0]);
      const lngSecond = Number(coords[1]);
      if (Number.isFinite(latFirst) && Number.isFinite(lngSecond)) {
        return { lat: latFirst, lng: lngSecond };
      }
    }
    const latCandidates = [coords.lat, coords.latitude, coords.y, coords.latLng?.lat];
    const lngCandidates = [coords.lng, coords.longitude, coords.x, coords.latLng?.lng];
    const lat = latCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    const lng = lngCandidates.map(v => Number(v)).find(v => Number.isFinite(v));
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat: lat as number, lng: lng as number };
    }
    return null;
  }

  formatCoordinates(raw: any): string {
    const coords = this.normalizeCoordinates(raw);
    if (!coords) {
      return '';
    }
    const lat = Number.isFinite(coords.lat) ? coords.lat : null;
    const lng = Number.isFinite(coords.lng) ? coords.lng : null;
    if (lat === null || lng === null) {
      return '';
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  private extractMapFeatures(raw: any): Feature[] {
    if (!raw) {
      return [];
    }
    let value = raw;
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value
        .filter((entry) => entry && typeof entry === 'object' && entry.type === 'Feature' && entry.geometry)
        .map((entry) => this.cloneFeature(entry as Feature));
    }
    if (value && typeof value === 'object') {
      if (value.type === 'FeatureCollection' && Array.isArray((value as any).features)) {
        return this.extractMapFeatures((value as any).features);
      }
      if (value.type === 'Feature') {
        return this.extractMapFeatures([value]);
      }
    }
    return [];
  }

  private normalizeViewportPayload(
    source: any,
    fallback: { lat: number; lng: number } | null | undefined
  ): { center: { lat: number; lng: number }; zoom: number } | null {
    if (source && typeof source === 'object') {
      const zoomCandidate = Number((source as any).zoom ?? (source as any).level);
      const centerCandidate = (source as any).center || source;
      const lat = Number(centerCandidate?.lat ?? centerCandidate?.latitude);
      const lng = Number(centerCandidate?.lng ?? centerCandidate?.longitude ?? centerCandidate?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          center: { lat, lng },
          zoom: Number.isFinite(zoomCandidate) ? zoomCandidate : 14,
        };
      }
    }
    if (fallback && Number.isFinite(fallback.lat) && Number.isFinite(fallback.lng)) {
      return {
        center: { lat: fallback.lat, lng: fallback.lng },
        zoom: 14,
      };
    }
    return null;
  }

  private initializeMapEditor(req: any | null): void {
    if (!req) {
      this.mapPlans = [];
      this.mapHighlightedPlanId = null;
      this.mapDraftFeature = null;
      this.mapMarker = null;
      this.mapViewport = null;
      this.mapDraftDirty = false;
      this.mapEditing = false;
      this.mapSaving = false;
      this.mapError = '';
      this.mapFeatureBuffer = [];
      this.mapDraftSummary = 'Draw the infrastructure footprint on the map.';
      this.mapInstance = null;
      return;
    }

    const marker = this.normalizeCoordinates(req?.mapMarker || req?.location?.coordinates || req?.location);
    const features = this.extractMapFeatures(req?.mapFeatures);
    const workingFeatures = features.length
      ? features
      : marker
      ? [this.buildPointFeature(marker.lat, marker.lng)]
      : [];

    this.mapFeatureBuffer = workingFeatures.map((feature) => this.cloneFeature(feature)).filter(Boolean) as Feature[];
    this.mapPlans = this.mapFeatureBuffer.map((feature, index) => this.toWorkspacePlan(req, feature, index));
    this.mapHighlightedPlanId = this.mapPlans[0]?.id ?? null;
    this.mapDraftFeature = null;
    this.mapMarker = marker ?? this.deriveMarkerFromFeature(this.mapFeatureBuffer[0]);
    this.mapViewport = this.normalizeViewportPayload(req?.mapViewport, this.mapMarker);
    this.mapDraftDirty = false;
    this.mapEditing = false;
    this.mapSaving = false;
    this.mapError = '';
    this.mapDraftSummary = 'Draw the infrastructure footprint on the map.';

    if (this.mapViewport) {
      setTimeout(() => this.applyViewportToMap(), 150);
    } else {
      setTimeout(() => this.detailWorkspace?.fitToPlans(), 200);
    }
  }

  private applyViewportToMap(): void {
    if (!this.mapInstance || !this.mapViewport) {
      return;
    }
    try {
      this.mapInstance.jumpTo({
        center: [this.mapViewport.center.lng, this.mapViewport.center.lat],
        zoom: this.mapViewport.zoom,
      });
    } catch {
      /* ignore map viewport errors */
    }
  }

  private buildPointFeature(lat: number, lng: number): Feature {
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat],
      },
      properties: {},
    };
  }

  private deriveMarkerFromFeature(feature: Feature | null | undefined): { lat: number; lng: number } | null {
    if (!feature?.geometry || feature.geometry.type !== 'Point') {
      return null;
    }
    const coords = feature.geometry.coordinates as [number, number];
    const lng = Number(coords?.[0]);
    const lat = Number(coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }

  private toWorkspacePlan(req: any, feature: Feature, index: number): MapWorkspacePlan {
    const commissioningDate = req?.requiredDate instanceof Date
      ? req.requiredDate.toISOString()
      : req?.requiredDate
      ? new Date(req.requiredDate).toISOString()
      : null;
    return {
      id: `${req?._id || req?.id || 'req'}-plan-${index}`,
      title: req?.title || 'Requisition',
      category: req?.status || 'Pending',
      commissioningDate,
  nextMaintenanceDate: null,
      expectedLifespanYears: null,
      feature: this.cloneFeature(feature),
      attributes: {
        Priority: req?.priority || '',
        Tehsil: req?.tehsil || '',
        District: req?.district || '',
      },
    };
  }

  private cloneFeature<T extends Feature | null | undefined>(feature: T): T {
    if (!feature) {
      return feature;
    }
    try {
      return JSON.parse(JSON.stringify(feature));
    } catch {
      return feature;
    }
  }

  editMap(): void {
    if (!this.selectedRequisition) {
      return;
    }
    if (!this.mapEditing) {
      const baseFeature = this.mapFeatureBuffer[0] ?? (this.mapMarker ? this.buildPointFeature(this.mapMarker.lat, this.mapMarker.lng) : null);
      this.mapEditing = true;
      this.mapDraftDirty = false;
      this.mapDraftFeature = baseFeature ? this.cloneFeature(baseFeature) : null;
      this.mapError = '';
      const mode = this.detectFeatureMode(this.mapDraftFeature);
      setTimeout(() => this.detailWorkspace?.beginDrawing(mode), 60);
    }
  }

  setMapDrawingMode(mode: DrawMode): void {
    if (!this.mapEditing) {
      this.editMap();
    }
    setTimeout(() => this.detailWorkspace?.beginDrawing(mode), 40);
  }

  clearMapDraft(): void {
    this.detailWorkspace?.clearDraft();
    this.mapDraftFeature = null;
    this.mapFeatureBuffer = [];
    this.mapMarker = null;
    this.mapDraftDirty = true;
    this.mapDraftSummary = 'Geometry cleared. Choose a drawing tool to sketch the new footprint.';
  }

  onMapReady(map: MapLibreMap): void {
    this.mapInstance = map;
    try {
      map.on('moveend', () => this.captureMapViewport(map));
      map.on('zoomend', () => this.captureMapViewport(map));
    } catch {
      /* ignore map event wiring errors */
    }
    if (this.mapViewport) {
      this.applyViewportToMap();
    } else if (this.mapPlans.length) {
      setTimeout(() => this.detailWorkspace?.fitToPlans(), 80);
    }
  }

  private captureMapViewport(map: MapLibreMap | null): void {
    if (!map) {
      return;
    }
    try {
      const center = map.getCenter();
      this.mapViewport = {
        center: {
          lat: Number(center.lat.toFixed(6)),
          lng: Number(center.lng.toFixed(6)),
        },
        zoom: map.getZoom(),
      };
    } catch {
      /* ignore viewport capture errors */
    }
  }

  onMapDraftFeatureChange(feature: Feature | null): void {
    if (!this.mapEditing) {
      this.mapEditing = true;
    }
    if (!feature || !feature.geometry || feature.geometry.type === 'GeometryCollection') {
      this.mapDraftFeature = null;
      this.mapFeatureBuffer = [];
      this.mapMarker = null;
      this.mapDraftDirty = true;
      return;
    }
    this.mapDraftFeature = this.cloneFeature(feature);
    this.mapFeatureBuffer = [this.cloneFeature(feature) as Feature];
    this.mapDraftDirty = true;
    if (feature.geometry.type === 'Point') {
      this.mapMarker = this.deriveMarkerFromFeature(feature);
    } else {
      this.mapMarker = null;
    }
  }

  onMapDraftSummaryChange(summary: string): void {
    this.mapDraftSummary = summary || 'Draw the infrastructure footprint on the map.';
  }

  saveMapEdits(): void {
    if (!this.selectedRequisition) {
      return;
    }
    const features = this.mapFeatureBuffer.map((feature) => this.cloneFeature(feature));
    const marker = this.mapMarker;
    const payload: any = {
      mapFeatures: features.length
        ? {
            type: 'FeatureCollection',
            features,
          }
        : { type: 'FeatureCollection', features: [] },
      mapMarker: marker ? { lat: marker.lat, lng: marker.lng } : null,
    };

    if (marker) {
      payload.location = {
        type: 'Point',
        coordinates: [marker.lng, marker.lat],
      };
      if (this.selectedRequisition?.location?.address) {
        payload.locationAddress = this.selectedRequisition.location.address;
      }
    } else {
      payload.location = null;
      if (typeof this.selectedRequisition?.location?.address === 'string') {
        payload.locationAddress = this.selectedRequisition.location.address;
      }
    }

    if (this.mapViewport) {
      payload.mapViewport = this.mapViewport;
    }

    this.mapSaving = true;
    this.mapError = '';
    this.requisitionsService.updateMap(this.selectedRequisition._id, payload).subscribe({
      next: res => {
        this.mapSaving = false;
        const normalized = this.normalizeRequisition(res);
        this.selectedRequisition = normalized;
        this.initializeMapEditor(normalized);
        this.notificationService.push('Map details updated successfully', {
          type: 'success',
          context: { requisitionId: normalized?._id }
        });
        this.refreshList();
      },
      error: err => {
        this.mapSaving = false;
        this.mapError = err?.error?.msg || err?.message || 'Unable to update map details.';
      }
    });
  }

  cancelMapEditing(): void {
    if (this.selectedRequisition) {
      this.initializeMapEditor(this.selectedRequisition);
    } else {
      this.initializeMapEditor(null);
    }
  }

  canEditMap(req: any): boolean {
    if (!req) {
      return false;
    }
    if ((this.role || '').toLowerCase() === 'citizen') {
      return false;
    }
    if (this.roleIsDm() || this.roleIsChief()) {
      return true;
    }
    if (this.roleIsBccOfficer() || this.roleIsTm() || this.roleIsWb()) {
      return this.isAssignedToCurrentUser(req);
    }
    return false;
  }

  private detectFeatureMode(feature: Feature | null): DrawMode {
    const geometryType = feature?.geometry?.type || '';
    if (!geometryType) {
      return 'marker';
    }
    if (geometryType === 'Point') {
      return 'marker';
    }
    if (geometryType.includes('Polygon')) {
      return 'polygon';
    }
    return 'polyline';
  }

  // Role-based workflow actions
  forwardFromDmToBcc() {
    if (!this.selectedRequisition) return;
    if (!this.canDmForward(this.selectedRequisition)) {
      alert('This requisition is not in the DM queue.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required to forward the requisition.');
    if (!remarksText) return;
    this.requisitionsService.dmForwardToBcc(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Forwarded to BCC officer');
    }, err => alert('DM forward error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  bccForwardToTm() {
    if (!this.selectedRequisition) return;
    if (!this.canBccForwardToTm(this.selectedRequisition)) {
      alert('This requisition is not ready for TM review.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required before sending to TM.');
    if (!remarksText) return;
    this.requisitionsService.bccForwardToTm(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Forwarded to Tehsil Manager');
    }, err => alert('BCC forward error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  tmForwardToChief() {
    if (!this.selectedRequisition) return;
    if (!this.canTmForwardChief(this.selectedRequisition)) {
      alert('This requisition is not assigned for TM action.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required before sending to BCC Specialist.');
    if (!remarksText) return;
    this.requisitionsService.tmForwardToChief(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Forwarded to BCC Specialist');
    }, err => alert('TM forward error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  chiefForwardToBcc() {
    if (!this.selectedRequisition) return;
    if (!this.canChiefForwardToBcc(this.selectedRequisition)) {
      alert('Case is not awaiting BCC Specialist review.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required before sending to BCC officer.');
    if (!remarksText) return;
    this.requisitionsService.chiefForwardToBcc(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Returned to BCC officer for WB dispatch');
    }, err => alert('Chief forward error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  bccForwardToWb() {
    if (!this.selectedRequisition) return;
    if (!this.canBccForwardToWb(this.selectedRequisition)) {
      alert('This requisition is not in WB dispatch stage.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required before sending to WB user.');
    if (!remarksText) return;
    this.requisitionsService.bccForwardToWb(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Forwarded to WB user');
    }, err => alert('WB dispatch error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  wbApprove() {
    if (!this.selectedRequisition) return;
    if (!this.canWbApprove(this.selectedRequisition)) {
      alert('This requisition is not assigned to WB user.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required for WB approval.');
    if (!remarksText) return;
    this.requisitionsService.wbApprove(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'WB approval recorded');
    }, err => alert('WB approval error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  chiefMarkToTm() {
    if (!this.selectedRequisition) return;
    if (!this.canChiefMarkToTm(this.selectedRequisition)) {
      alert('This requisition is not ready to be marked to TM.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required to mark the case to TM.');
    if (!remarksText) return;
    this.requisitionsService.chiefMarkToTm(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Marked to TM');
    }, err => alert('Chief mark error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  tmForwardToBccClosure() {
    if (!this.selectedRequisition) return;
    if (!this.canTmForwardBccClosure(this.selectedRequisition)) {
      alert('This requisition is not ready for BCC closure.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Remarks are required before forwarding to BCC for closure.');
    if (!remarksText) return;
    this.requisitionsService.tmForwardToBcc(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Sent to BCC officer for closure');
    }, err => alert('TM to BCC error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  bccCloseCase() {
    if (!this.selectedRequisition) return;
    if (!this.canBccClose(this.selectedRequisition)) {
      alert('This requisition is not in closure stage.');
      return;
    }
    const remarksText = this.requireWorkflowRemarks('Closure remarks are required.');
    if (!remarksText) return;
    this.requisitionsService.bccCloseCase(this.selectedRequisition._id, remarksText).subscribe(res => {
      this.afterWorkflowSuccess(res, 'Case closed');
    }, err => alert('BCC close error: ' + (err?.error?.msg || err?.message || 'Unknown')));
  }

  downloadRequisitionPdf(req: any): void {
    if (!req || !req._id) {
      alert('Missing requisition identifier.');
      return;
    }
    if (this.downloadingPdf) {
      return;
    }
    this.downloadingPdf = true;
    this.requisitionsService.downloadRequisitionPdf(req._id).subscribe({
      next: blob => {
        this.downloadingPdf = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const prefix = req.sequenceNumber != null ? `requisition-${req.sequenceNumber}` : req._id;
        link.href = url;
        link.download = `${prefix}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.notificationService.push('Requisition PDF downloaded', {
          type: 'success',
          context: { requisitionId: req._id }
        });
      },
      error: err => {
        this.downloadingPdf = false;
        alert('Unable to download PDF: ' + (err?.error?.msg || err?.message || 'Unknown error'));
      }
    });
  }

  downloadDueDiligencePdf(req: any): void {
    if (!req || !req._id) {
      alert('Missing requisition identifier.');
      return;
    }
    if (this.downloadingDueDiligence) {
      return;
    }
    this.downloadingDueDiligence = true;
    this.requisitionsService.downloadDueDiligencePdf(req._id).subscribe({
      next: blob => {
        this.downloadingDueDiligence = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        const prefix = req.sequenceNumber != null ? `due-diligence-${req.sequenceNumber}` : `due-diligence-${req._id}`;
        link.href = url;
        link.download = `${prefix}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        this.notificationService.push('Due Diligence Form downloaded', {
          type: 'success',
          context: { requisitionId: req._id }
        });
      },
      error: err => {
        this.downloadingDueDiligence = false;
        alert('Unable to download Due Diligence PDF: ' + (err?.error?.msg || err?.message || 'Unknown error'));
      }
    });
  }

  private afterWorkflowSuccess(response: any, message: string) {
    this.selectedRequisition = this.normalizeRequisition(response);
    this.workflowRemarks = '';
    this.updateWorkflowTimeline(this.selectedRequisition?.status);
    this.refreshList();
    this.notificationService.push(message, {
      type: 'success',
      context: { requisitionId: response?._id || this.selectedRequisition?._id }
    });
  }

  private requireWorkflowRemarks(promptText: string): string | null {
    const remarksText = (this.workflowRemarks || '').trim();
    if (!remarksText) {
      alert(promptText);
      return null;
    }
    return remarksText;
  }

  revertCurrentRequisition() {
    if (!this.selectedRequisition) {
      return;
    }
    const remarksText = (this.revertRemarks || '').trim();
    if (!remarksText) {
      alert('Justification is required to revert the requisition.');
      return;
    }
    const revertTarget = this.revertStatus || undefined;
    this.requisitionsService.revertRequisition(this.selectedRequisition._id, remarksText, revertTarget).subscribe({
      next: res => {
        alert('Requisition reverted successfully.');
        this.selectedRequisition = this.normalizeRequisition(res);
        this.revertRemarks = '';
        this.revertStatus = '';
        this.updateWorkflowTimeline(this.selectedRequisition?.status);
        this.refreshList();
        this.notificationService.push('Requisition reverted', {
          type: 'warning',
          context: { requisitionId: res?._id || this.selectedRequisition?._id, targetStatus: revertTarget }
        });
      },
      error: err => {
        alert('Revert error: ' + (err?.error?.msg || err?.message || 'Unknown'));
      }
    });
  }

  refreshList() {
    this.requisitionsService.getRequisitions().subscribe((data: any) => {
      this.requisitions = Array.isArray(data) ? data.map(item => this.normalizeRequisition(item)) : [];
      const activeId = this.selectedRequisition?._id;
      if (activeId) {
        const updated = this.requisitions.find(req => (req?._id || req?.id) === activeId);
        if (updated) {
          this.selectedRequisition = this.normalizeRequisition(updated);
          this.updateWorkflowTimeline(this.selectedRequisition?.status);
          this.initLandForm(this.selectedRequisition);
          this.initializeMapEditor(this.selectedRequisition);
        }
      }
      if (this.pendingSelectionId) {
        this.trySelectPending(this.pendingSelectionId);
      }
    });
  }

  // Expose current role to template
  get role(): string {
    return (localStorage.getItem('role') || '').toString();
  }

  get mapHasGeometry(): boolean {
    return this.mapFeatureBuffer.length > 0 || this.mapPlans.length > 0 || !!this.mapMarker;
  }

  get landRepository(): any[] {
    return this.requisitions.filter(req => !!req.landAcquisition);
  }

  exportLandRepository(): void {
    const dataset = this.landRepository;
    if (!dataset.length) {
      this.notificationService.push('No land acquisition records available for export', { type: 'warning' });
      return;
    }
    try {
      const headers = [
        'Requisition Title',
        'Stage',
        'Land Type',
        'Donor Name',
        'Contact Number',
        'CNIC',
        'Village',
        'Tehsil',
        'District',
        'Khasra Number',
        'Recorded Area',
        'Land Category',
        'Donation Type',
        'Donation Purpose',
        'Willingness Date',
        'Verification By',
        'Verification Date',
        'Approval Status',
        'Approval By',
        'Updated On',
        'Updated By'
      ];
      const headerRow = headers.map(label => `<th>${this.escapeForExcel(label)}</th>`).join('');
      const bodyRows = dataset.map(record => {
        const landAcquisition = record.landAcquisition || {};
        const donor = landAcquisition.donor || {};
        const land = landAcquisition.land || {};
        const donation = landAcquisition.donation || {};
        const verification = landAcquisition.verification || {};
        const updatedByRaw = landAcquisition.updatedBy;
        const updatedBy = updatedByRaw && typeof updatedByRaw === 'object'
          ? (updatedByRaw.name || updatedByRaw.email || updatedByRaw.fullName || '')
          : this.clean(updatedByRaw);
        const cells = [
          record.title || '',
          landAcquisition.status || '',
          landAcquisition.type || record.landType || '',
          donor.fullName || '',
          donor.contactNumber || '',
          donor.cnic || '',
          donor.villageName || '',
          donor.tehsil || record.tehsil || '',
          donor.district || '',
          land.khasraNumber || '',
          land.area || '',
          land.landCategory || '',
          donation.donationType || '',
          donation.purpose || '',
          this.formatDateForExport(donation.willingnessDate),
          verification.verifiedBy || '',
          this.formatDateForExport(verification.verifiedDate),
          verification.approvalStatus || '',
          verification.approvedBy || '',
          this.formatDateForExport(landAcquisition.updatedAt),
          updatedBy
        ];
        const rowHtml = cells
          .map(value => `<td>${this.escapeForExcel(value)}</td>`)
          .join('');
        return `<tr>${rowHtml}</tr>`;
      }).join('');
  const tableHtml = `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  const stamp = new Date().toISOString().split('T')[0];
        const blob = new Blob(['\ufeff' + tableHtml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `land-acquisition-report-${stamp}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  this.notificationService.push('Excel report prepared for download', { type: 'success' });
    } catch (error) {
      console.error('Excel export error', error);
      this.notificationService.push('Unable to prepare Excel report. Please try again.', { type: 'critical' });
    }
  }

  private trySelectPending(id: string) {
    const match = this.requisitions.find(req => (req?._id || req?.id) === id);
    if (match) {
      this.viewRequisition(match);
      this.pendingSelectionId = null;
      this.router.navigate([], { queryParams: {}, replaceUrl: true, relativeTo: this.route });
    }
  }

  closeModal() {
    this.selectedRequisition = null;
    this.workflowTimeline = [];
    this.workflowRemarks = '';
    this.revertRemarks = '';
    this.revertStatus = '';
    this.landFormVisible = false;
    this.landError = '';
    this.landExistingDocs = [];
    this.landKeepAttachmentMap = {};
    this.landNewDocuments = [];
    this.ownershipProofFile = null;
    this.ownershipProofName = null;
    this.landForm = this.blankLandForm();
    this.dueDiligenceGovtEntries = [];
    this.dueDiligencePrivateEntries = [];
    this.resetLandFileInputs();
    this.initializeMapEditor(null);
  }

  private extractId(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object') {
      return value._id || value.id || value.userId || value.uuid || '';
    }
    return '';
  }

  private statusMatches(req: any, states: string | string[]): boolean {
    const current = (req?.status || '').toString().trim().toLowerCase();
    if (Array.isArray(states)) {
      return states.some(state => state.toLowerCase() === current);
    }
    return current === states.toString().trim().toLowerCase();
  }

  private isAssignedToCurrentUser(req: any): boolean {
    const assignedId = this.extractId(req?.assignedTo) || req?.assignedToId || '';
    if (!assignedId) {
      return false;
    }
    return assignedId === (this.currentUser?.id || '');
  }

  private roleIsDm(): boolean {
    const role = this.role;
    return role === 'DM Tehsil' || role === 'Tehsil DM';
  }

  private roleIsBccOfficer(): boolean {
    return ['BCC Officer', 'BCC Officer Tehsil'].includes(this.role);
  }

  private roleIsChief(): boolean {
    return ['BCC Specialist'].includes(this.role);
  }

  private roleIsTm(): boolean {
    return ['Tehsil Manager'].includes(this.role);
  }

  private roleIsWb(): boolean {
    return ['WB User'].includes(this.role);
  }

  canMarkLandAcquisitionComplete(req: any): boolean {
    if (!req) {
      return false;
    }
    if (!req.landAcquisition) {
      return false;
    }
    const landStatus = (req?.landAcquisition?.status || '').toString().trim().toLowerCase();
    if (landStatus === 'acquisition complete') {
      return false;
    }
    if (this.roleIsChief()) {
      return true;
    }
    if (!this.roleIsBccOfficer()) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canDmForward(req: any): boolean {
    if (!req || !this.roleIsDm()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingDm)) {
      return false;
    }
    const assignedId = this.extractId(req?.assignedTo) || req?.assignedToId || '';
    return !assignedId || assignedId === (this.currentUser?.id || '');
  }

  canBccForwardToTm(req: any): boolean {
    if (!req || !this.roleIsBccOfficer()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingBcc)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canTmForwardChief(req: any): boolean {
    if (!req || !this.roleIsTm()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingTm)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canChiefForwardToBcc(req: any): boolean {
    if (!req || !this.roleIsChief()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingChief)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canBccForwardToWb(req: any): boolean {
    if (!req || !this.roleIsBccOfficer()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingWbDispatch)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canWbApprove(req: any): boolean {
    if (!req || !this.roleIsWb()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingWbApproval)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canChiefMarkToTm(req: any): boolean {
    if (!req || !this.roleIsChief()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.wbApproved)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canTmForwardBccClosure(req: any): boolean {
    if (!req || !this.roleIsTm()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.markedToTm)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canBccClose(req: any): boolean {
    if (!req || !this.roleIsBccOfficer()) {
      return false;
    }
    if (!this.statusMatches(req, this.workflowStatus.pendingBccClosure)) {
      return false;
    }
    return this.isAssignedToCurrentUser(req);
  }

  canEditLandAcquisition(req: any): boolean {
    if (!req) {
      return false;
    }
    if (this.roleIsChief()) {
      return true;
    }
    if (!this.roleIsBccOfficer()) {
      return false;
    }
    if (!this.isAssignedToCurrentUser(req)) {
      return false;
    }
    const editableStatuses = [
      'Assigned to BCC',
      'Land Acquisition Updated',
      'Donor Data Uploaded',
      'Documentation Added',
      'Identification Pending',
      'Document Collection',
      'Verification Scheduled',
      'Verification Complete',
      'Submitted for Approval',
      'Approved',
      'Acquisition Complete'
    ];
    return this.statusMatches(req, editableStatuses);
  }

  showWorkflowRemarks(req: any): boolean {
    return (
      this.canDmForward(req) ||
      this.canBccForwardToTm(req) ||
      this.canTmForwardChief(req) ||
      this.canChiefForwardToBcc(req) ||
      this.canBccForwardToWb(req) ||
      this.canWbApprove(req) ||
      this.canChiefMarkToTm(req) ||
      this.canTmForwardBccClosure(req) ||
      this.canBccClose(req)
    );
  }

  attachmentUrl(path: string | null | undefined): string | null {
    if (!path) {
      return null;
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    const trimmedBase = this.uploadsBaseUrl.replace(/\/$/, '');
    const sanitizedPath = path.replace(/^\/+/, '').replace(/\\/g, '/');
    return `${trimmedBase}/${sanitizedPath}`;
  }
}
