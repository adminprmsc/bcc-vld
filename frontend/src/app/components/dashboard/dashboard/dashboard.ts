import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RequisitionsService } from '../../requisitions/requisitions.service';
import { AdminUserManagementComponent } from '../user-list.component';
import { Router } from '@angular/router';

interface RoleDescriptor {
  title: string;
  tagline: string;
  highlight: string;
  focusStatuses: string[];
}

interface DashboardMetric {
  label: string;
  value: number | string;
  accent: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

const ROLE_DESCRIPTORS: Record<string, RoleDescriptor> = {
  'Infra Engineer': {
    title: 'Infra Engineer Operations',
    tagline: 'Review technical inputs, coordinate with CID, and keep requisitions moving forward.',
    highlight: 'Assignments waiting for your site verification',
    focusStatuses: ['assigned to infra', 'assigned to cid']
  },
  'CID': {
    title: 'CID Review Desk',
    tagline: 'Validate documentation, record approvals, and collaborate with engineering teams.',
    highlight: 'Cases awaiting CID approval',
    focusStatuses: ['assigned to cid', 'approved by cid']
  },
  'BCC Specialist': {
    title: 'BCC Specialist Workspace',
    tagline: 'Oversee BCC submissions, assign officers, and track donor engagement.',
    highlight: 'Requests waiting for BCC Specialist routing',
    focusStatuses: ['assigned to bcc', 'marked to chief']
  },
  'BCC Officer Tehsil': {
    title: 'BCC Officer Hub',
    tagline: 'Upload donor documentation, verify land information, and keep chief informed.',
    highlight: 'Requests waiting for documentation updates',
    focusStatuses: ['assigned to bcc', 'documentation added']
  },
  'EDCS Consultant': {
    title: 'Consultant Planning Overview',
    tagline: 'Draft proposed utilities, sync revisions, and track requisitions ready for detailing.',
    highlight: 'Sites awaiting proposed layouts',
    focusStatuses: ['acquisition complete', 'assigned to bcc']
  },
  'EDCS User': {
    title: 'EDCS Planning Overview',
    tagline: 'Map proposed infrastructure, coordinate revisions, and share plans with field teams.',
    highlight: 'Sites awaiting proposed layouts',
    focusStatuses: ['acquisition complete', 'assigned to bcc']
  },
  'RA Environment': {
    title: 'Environmental Oversight',
    tagline: 'Coordinate sampling operations, review compliance, and align PCRWR field teams.',
    highlight: 'Sampling campaigns needing attention',
    focusStatuses: []
  },
  'PCRWR Sampler': {
    title: 'Field Sampling Queue',
    tagline: 'Track assigned sample sites, capture field observations, and notify laboratory staff.',
    highlight: 'Upcoming water-quality collections',
    focusStatuses: []
  },
  'PCRWR Lab': {
    title: 'Laboratory Analysis Desk',
    tagline: 'Log received samples, post lab measurements, and release quality reports.',
    highlight: 'Samples awaiting lab analysis',
    focusStatuses: []
  },
  'Tehsil Manager': {
    title: 'PRMSC Maintenance Oversight',
    tagline: 'Review consultant submissions, schedule upkeep, and record Red Book maintenance updates.',
    highlight: 'Assets due for operation & maintenance actions',
    focusStatuses: []
  },
  'Super Admin': {
    title: 'Command Center',
    tagline: 'Monitor every role, health-check data quality, and support rapid decisions.',
    highlight: 'System-wide requisitions across departments',
    focusStatuses: []
  },
  'Admin': {
    title: 'Administrative Oversight',
    tagline: 'Keep records clean, monitor workflows, and assist operational teams.',
    highlight: 'Data quality checkpoints across requisitions',
    focusStatuses: []
  },
  'Citizen': {
    title: 'My Land Donations',
    tagline: 'Track the progress of every parcel you have submitted for voluntary donation.',
    highlight: 'Requests awaiting government review',
    focusStatuses: ['pending', 'approved', 'rejected']
  },
  Default: {
    title: 'Workflow Overview',
    tagline: 'Stay current with the requisitions relevant to your role.',
    highlight: 'Recent activity and pending actions',
    focusStatuses: []
  }
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminUserManagementComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  readonly descriptor: RoleDescriptor;
  readonly role: string;
  readonly userId: string;
  readonly userName: string;
  readonly isAdminRole: boolean;
  metrics: DashboardMetric[] = [];
  requisitions: any[] = [];
  visibleRequisitions: any[] = [];
  filterStatus: string = '';
  showMineOnly: boolean = false;
  searchTerm: string = '';
  loading = false;
  uniqueStatuses: string[] = [];
  private requisitionsService = inject(RequisitionsService);
  private router = inject(Router);

  constructor() {
    const stored = localStorage.getItem('user');
    let parsed: any = {};
    try {
      parsed = stored ? JSON.parse(stored) : {};
    } catch {
      parsed = {};
    }
    this.role = parsed.role || '';
    this.userId = parsed.id || parsed.userId || '';
    this.userName = parsed.name || 'User';
    this.descriptor = ROLE_DESCRIPTORS[this.role] || ROLE_DESCRIPTORS['Default'];
    this.isAdminRole = this.role === 'Super Admin' || this.role === 'Admin';
  }

  ngOnInit(): void {
    this.loadRequisitions();
  }

  get filteredRequisitions() {
    const statusFilter = (this.filterStatus || '').toLowerCase();
    const query = (this.searchTerm || '').toLowerCase();
    return this.visibleRequisitions.filter(req => {
      const status = (req.status || '').toLowerCase();
      const matchesStatus = !statusFilter || status.includes(statusFilter);
      const matchesMine = !this.showMineOnly || (req.assignedToId === this.userId || req.requestedById === this.userId);
      const matchesQuery = !query || (req.title || '').toLowerCase().includes(query) || (req.purpose || '').toLowerCase().includes(query);
      return matchesStatus && matchesMine && matchesQuery;
    });
  }

  formatArea(req: any): string {
    if (req.calculatedAreaSqFt) {
      return `${req.calculatedAreaSqFt.toLocaleString()} sq ft`;
    }
    if (req.landArea) {
      return req.landArea;
    }
    return 'N/A';
  }

  statusBadgeClass(status: string): string {
    const normalized = (status || '').toLowerCase();
    if (normalized.includes('approved')) return 'status-approved';
    if (normalized.includes('reject')) return 'status-rejected';
    if (normalized.includes('assign')) return 'status-in-progress';
    return 'status-pending';
  }

  formatAssignee(req: any): string {
    if (req.assignedToName) {
      return req.assignedToName;
    }
    if (req.assignedTo?.name) {
      return req.assignedTo.name;
    }
    return 'Unassigned';
  }

  toggleMineOnly() {
    this.showMineOnly = !this.showMineOnly;
  }

  private loadRequisitions() {
    this.loading = true;
    this.requisitionsService.getRequisitions().subscribe({
      next: data => {
        const normalized = Array.isArray(data) ? data.map(item => this.normalize(item)) : [];
        this.requisitions = normalized;
        const filtered = this.filterByRole(normalized);
        filtered.sort((a, b) => {
          const aTime = a.lastUpdated instanceof Date ? a.lastUpdated.getTime() : (a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0);
          const bTime = b.lastUpdated instanceof Date ? b.lastUpdated.getTime() : (b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0);
          return bTime - aTime;
        });
        this.visibleRequisitions = filtered;
        this.uniqueStatuses = Array.from(new Set(this.visibleRequisitions.map(r => (r.status || '').toString().trim()).filter(Boolean))).sort();
        this.computeMetrics();
        this.loading = false;
      },
      error: err => {
        console.error('Unable to load requisitions', err);
        this.loading = false;
      }
    });
  }

  private normalize(req: any) {
    const breadth = Number(req.landBreadth) || 0;
    const depth = Number(req.landDepth) || 0;
    const areaSqFt = Number(req.calculatedAreaSqFt) || (breadth && depth ? breadth * depth : 0);
    const marlas = Number(req.calculatedAreaMarlas) || (areaSqFt ? Number((areaSqFt / 272.25).toFixed(2)) : 0);
    const kanals = Number(req.calculatedAreaKanals) || (areaSqFt ? Number((areaSqFt / 5445).toFixed(2)) : 0);
    return {
      ...req,
      landBreadth: breadth,
      landDepth: depth,
      calculatedAreaSqFt: areaSqFt,
      calculatedAreaMarlas: marlas,
      calculatedAreaKanals: kanals,
      requestedById: req.requestedBy?._id || req.requestedBy?.id || req.requestedById || '',
      assignedToId: req.assignedTo?._id || req.assignedTo?.id || req.assignedToId || '',
      assignedToName: req.assignedTo?.name || req.assignedToName || '',
      requiredDate: req.requiredDate ? new Date(req.requiredDate) : null,
      lastUpdated: req.lastUpdated ? new Date(req.lastUpdated) : null
    };
  }

  private filterByRole(data: any[]): any[] {
    const role = (this.role || '').toLowerCase();
    if (!role) {
      return data;
    }
    if (role === 'super admin' || role === 'admin') {
      return data;
    }
    if (role === 'citizen') {
      return data.filter(req => req.requestedById === this.userId);
    }
    if (role === 'infra engineer') {
      return data.filter(req => {
        const status = (req.status || '').toLowerCase();
        const isMine = req.assignedToId === this.userId || req.requestedById === this.userId;
        if (isMine) {
          return true;
        }
        return status.includes('infra') || status.includes('cid') || status.includes('pending') || status.includes('new');
      });
    }
    if (role === 'cid') {
      return data.filter(req => {
        const status = (req.status || '').toLowerCase();
        return req.assignedToId === this.userId || status.includes('cid');
      });
    }
    if (role === 'bcc specialist') {
      return data.filter(req => {
        const status = (req.status || '').toLowerCase();
        return status.includes('bcc') || status.includes('chief');
      });
    }
    if (role === 'bcc officer tehsil') {
      return data.filter(req => (req.status || '').toLowerCase().includes('bcc'));
    }
    return data;
  }

  private needsAttention(req: any): boolean {
    const status = (req.status || '').toLowerCase();
    const role = (this.role || '').toLowerCase();
    if (role === 'infra engineer') {
      return status.includes('infra') && (!req.assignedToId || req.assignedToId === this.userId);
    }
    if (role === 'cid') {
      return status.includes('cid') && req.assignedToId === this.userId;
    }
    if (role === 'bcc specialist') {
      return status.includes('chief') || status.includes('bcc');
    }
    if (role === 'bcc officer tehsil') {
      return status.includes('bcc');
    }
    if (role === 'citizen') {
      return status.includes('pending') || status.includes('assign');
    }
    return false;
  }

  private computeMetrics() {
    const totals = this.visibleRequisitions.reduce((acc, req) => {
      const status = (req.status || 'pending').toLowerCase();
      acc.total += 1;
      if (status.includes('approved')) acc.approved += 1;
      else if (status.includes('reject')) acc.rejected += 1;
      else if (status.includes('assign')) acc.inProgress += 1;
      else acc.pending += 1;
      acc.area += req.calculatedAreaSqFt || (typeof req.landArea === 'string' ? parseFloat(req.landArea) : Number(req.landArea) || 0);
      if (req.assignedToId === this.userId) {
        acc.assignedToMe += 1;
      }
      if (this.needsAttention(req)) {
        acc.awaiting += 1;
      }
      return acc;
    }, { total: 0, pending: 0, inProgress: 0, approved: 0, rejected: 0, area: 0, assignedToMe: 0, awaiting: 0 });

    this.metrics = [
      { label: 'Visible Requests', value: totals.total, accent: 'primary' },
      { label: 'Awaiting Action', value: totals.awaiting, accent: 'warning' },
      { label: 'Assigned to Me', value: totals.assignedToMe, accent: 'neutral' },
      { label: 'Approved', value: totals.approved, accent: 'success' },
      { label: 'Rejected', value: totals.rejected, accent: 'danger' },
      { label: 'Total Land (sq ft)', value: totals.area.toLocaleString(), accent: 'primary' }
    ];
  }

  openRequisition(req: any) {
    const id = req?._id || req?.id;
    if (!id) {
      return;
    }
    this.router.navigate(['/requisitions'], { queryParams: { id } });
  }

  openConsultantWorkspace(): void {
    this.router.navigate(['/edcs-consultant-dashboard']);
  }

  openWaterQualityWorkspace(): void {
    this.router.navigate(['/water-quality-dashboard']);
  }
}
