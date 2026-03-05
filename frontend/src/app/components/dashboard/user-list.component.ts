import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../shared/notification.service';
import { UserUpdate } from '../users/user-update';
import { AccessRequestService } from '../auth/access-request.service';

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  gender?: string;
  cnic?: string;
  cnicExpiry?: string;
  address?: string;
  dob?: string;
  phone?: string;
  activeStatus?: string;
}

interface CreateUserPayload {
  name: string;
  email: string;
  role: string;
  phone?: string;
  gender?: string;
  cnic?: string;
  cnicExpiry?: string;
  address?: string;
  dob?: string;
  activeStatus?: string;
  password?: string;
}

interface AccessRequestRecord {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  roleRequested?: string;
  tehsil?: string;
  status?: string;
  createdAt?: string;
}

const ROLE_OPTIONS = [
  'Super Admin',
  'Admin',
  'DM Tehsil',
  'Infra Engineer',
  'CID',
  'BCC Specialist',
  'BCC Officer Tehsil',
  'EDCS Consultant',
  'EDCS User',
  'RA Environment',
  'PCRWR Sampler',
  'PCRWR Lab',
  'Citizen'
];

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    UserUpdate
  ],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss']
})
export class AdminUserManagementComponent implements OnInit, OnDestroy {
  readonly displayedColumns = ['name', 'email', 'role', 'phone', 'status', 'actions'];
  readonly roleOptions = ROLE_OPTIONS;
  readonly filterControl = new FormControl('');
  readonly createForm: FormGroup;
  users: AdminUserRecord[] = [];
  accessRequests: AccessRequestRecord[] = [];
  loading = false;
  loadingRequests = false;
  creating = false;
  showCreatePanel = false;
  selectedUser: AdminUserRecord | null = null;
  showUpdateModal = false;
  lastTempPassword: string | null = null;
  errorMessage = '';
  requestsError = '';
  processingRequestId: string | null = null;
  currentUser: any = null;
  private readonly destroy$ = new Subject<void>();
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationService);
  private readonly accessRequestService = inject(AccessRequestService);

  constructor() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        this.currentUser = JSON.parse(storedUser);
      } catch {
        this.currentUser = null;
      }
    }
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', Validators.required],
      phone: [''],
      gender: [''],
      cnic: [''],
      cnicExpiry: [''],
      address: [''],
      dob: [''],
      activeStatus: ['active'],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.filterControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(value => this.loadUsers(value || ''));
    if (this.isPrivileged()) {
      this.loadAccessRequests();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUsers(query?: string): void {
    this.loading = true;
    this.errorMessage = '';
    this.authService.getUsers(query).pipe(takeUntil(this.destroy$)).subscribe({
      next: (users: any[] | null | undefined) => {
        this.users = (users || []).map((u: any) => ({
          id: u.id || u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          phone: u.phone || '',
          gender: u.gender || '',
          cnic: u.cnic || '',
          cnicExpiry: u.cnicExpiry || '',
          address: u.address || '',
          dob: u.dob || '',
          activeStatus: u.activeStatus || 'inactive'
        }));
        this.loading = false;
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err?.error?.msg || 'Unable to load users.';
      }
    });
  }

  private loadAccessRequests(): void {
    this.loadingRequests = true;
    this.requestsError = '';
    this.accessRequestService.list().pipe(takeUntil(this.destroy$)).subscribe({
      next: (requests: any[] | null | undefined) => {
        this.accessRequests = Array.isArray(requests)
          ? requests.map(req => ({
              _id: req._id,
              name: req.name,
              email: req.email,
              phone: req.phone,
              roleRequested: req.roleRequested,
              tehsil: req.tehsil,
              status: req.status,
              createdAt: req.createdAt
            }))
          : [];
        this.loadingRequests = false;
      },
      error: (err: any) => {
        this.loadingRequests = false;
        this.requestsError = err?.error?.msg || 'Unable to load access requests.';
      }
    });
  }

  openCreatePanel(): void {
    this.showCreatePanel = true;
    this.lastTempPassword = null;
  }

  closeCreatePanel(): void {
    this.showCreatePanel = false;
    this.createForm.reset({ activeStatus: 'active', role: '' });
    this.lastTempPassword = null;
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating = true;
    this.errorMessage = '';
    const payload = this.createForm.getRawValue() as CreateUserPayload;
    this.authService.createUser(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.creating = false;
        this.notifications.push('User account created successfully.', { type: 'success' });
        this.lastTempPassword = res?.tempPassword || null;
        this.createForm.reset({ activeStatus: 'active', role: '' });
        this.loadUsers(this.filterControl.value || undefined);
      },
      error: (err: any) => {
        this.creating = false;
        this.errorMessage = err?.error?.msg || 'Unable to create user.';
      }
    });
  }

  toggleActive(user: AdminUserRecord): void {
    const nextStatus = user.activeStatus === 'active' ? 'inactive' : 'active';
    this.authService.updateUser({ ...user, activeStatus: nextStatus }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (updated: any) => {
        user.activeStatus = updated?.activeStatus || nextStatus;
        this.notifications.push(`User ${user.name} marked as ${user.activeStatus}.`, { type: 'info' });
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.msg || 'Unable to update user status.';
      }
    });
  }

  approveRequest(request: AccessRequestRecord): void {
    if (!request?._id) {
      return;
    }
    if (!window.confirm(`Approve access for ${request.name}?`)) {
      return;
    }
    const roleOverride = window.prompt('Assign role (leave blank to keep requested role):', request.roleRequested || 'Citizen') || undefined;
    const notes = window.prompt('Optional notes for approval:') || undefined;
    this.processingRequestId = request._id;
    this.accessRequestService.approve(request._id, { role: roleOverride, notes }).pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.processingRequestId = null;
        this.notifications.push(`Approved request for ${request.name}.`, { type: 'success' });
        if (res?.tempPassword) {
          this.notifications.push(`Temporary password: ${res.tempPassword}`, { type: 'info' });
        }
        this.loadAccessRequests();
        this.loadUsers(this.filterControl.value || undefined);
      },
      error: err => {
        this.processingRequestId = null;
        this.requestsError = err?.error?.msg || 'Unable to approve request.';
      }
    });
  }

  rejectRequest(request: AccessRequestRecord): void {
    if (!request?._id) {
      return;
    }
    if (!window.confirm(`Reject access request for ${request.name}?`)) {
      return;
    }
    const notes = window.prompt('Provide a reason (optional):') || undefined;
    this.processingRequestId = request._id;
    this.accessRequestService.reject(request._id, { notes }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.processingRequestId = null;
        this.notifications.push(`Rejected request for ${request.name}.`, { type: 'warning' });
        this.loadAccessRequests();
      },
      error: err => {
        this.processingRequestId = null;
        this.requestsError = err?.error?.msg || 'Unable to reject request.';
      }
    });
  }

  openUpdate(user: AdminUserRecord): void {
    this.selectedUser = user;
    this.showUpdateModal = true;
  }

  closeUpdate(): void {
    this.showUpdateModal = false;
    this.selectedUser = null;
  }

  handleUserSaved(updated: any): void {
    if (!updated) {
      this.closeUpdate();
      return;
    }
    const idx = this.users.findIndex(u => u.id === (updated.id || updated._id));
    if (idx >= 0) {
      this.users[idx] = {
        ...this.users[idx],
        ...updated,
        id: updated.id || updated._id || this.users[idx].id,
        activeStatus: updated.activeStatus || this.users[idx].activeStatus
      };
    }
    this.notifications.push('User profile updated.', { type: 'success' });
    this.closeUpdate();
  }

  isPrivileged(): boolean {
    const role = (this.currentUser?.role || '').toString();
    return role === 'Super Admin' || role === 'Admin';
  }
}
