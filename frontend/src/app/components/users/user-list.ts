import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { UserUpdate } from './user-update';
import { AccessRequestService } from '../auth/access-request.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, UserUpdate],
  templateUrl: './user-list.html',
  styleUrl: './user-list.scss'
})
export class UserList {
  users: any[] = [];
  accessRequests: any[] = [];
  selectedUser: any = null;
  showUpdateModal: boolean = false;
  currentUser: any = null;
  loadingRequests = false;
  private authService = inject(AuthService);
  private accessRequestService = inject(AccessRequestService);

  constructor() {
    document.addEventListener('keydown', this.handleEscape.bind(this));
    // Get current user from localStorage or AuthService
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.currentUser = JSON.parse(userStr);
    }
  }

  ngOnDestroy() {
    document.removeEventListener('keydown', this.handleEscape.bind(this));
  }

  handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.selectedUser) {
        this.closeUpdateModal();
      }
    }
  }

  openUpdateModal(user: any) {
    this.selectedUser = user;
    this.showUpdateModal = true;
  }

  closeUpdateModal() {
    this.showUpdateModal = false;
    this.selectedUser = null;
  }

  ngOnInit() {
    this.loadUsers();
    if (this.isAdminRole()) {
      this.loadAccessRequests();
    }
  }

  private loadUsers() {
    this.authService.getUsers().subscribe((data: any) => {
      this.users = data;
    });
  }

  private loadAccessRequests() {
    this.loadingRequests = true;
    this.accessRequestService.list().subscribe({
      next: data => {
        this.accessRequests = Array.isArray(data) ? data : [];
        this.loadingRequests = false;
      },
      error: () => {
        this.loadingRequests = false;
        alert('Unable to load access requests.');
      }
    });
  }

  approveRequest(request: any) {
    if (!request?._id) {
      return;
    }
    const confirmApproval = confirm(`Approve access for ${request.name}?`);
    if (!confirmApproval) {
      return;
    }
    const roleOverride = prompt('Assign role (leave blank to keep requested role):', request.roleRequested || 'Citizen') || undefined;
    const notes = prompt('Optional notes for approval:') || undefined;
    this.accessRequestService.approve(request._id, { role: roleOverride, notes }).subscribe({
      next: res => {
        this.loadAccessRequests();
        this.loadUsers();
        const tempPassword = res?.tempPassword;
        alert(`Request approved. ${tempPassword ? `Temporary password: ${tempPassword}` : 'User already existed.'}`);
      },
      error: err => {
        alert(err?.error?.msg || 'Unable to approve request.');
      }
    });
  }

  rejectRequest(request: any) {
    if (!request?._id) {
      return;
    }
    const confirmRejection = confirm(`Reject access request for ${request.name}?`);
    if (!confirmRejection) {
      return;
    }
    const notes = prompt('Provide a reason (optional):') || undefined;
    this.accessRequestService.reject(request._id, { notes }).subscribe({
      next: () => {
        this.loadAccessRequests();
        alert('Request rejected.');
      },
      error: err => {
        alert(err?.error?.msg || 'Unable to reject request.');
      }
    });
  }

  isAdminRole(): boolean {
    const role = (this.currentUser?.role || '').toString();
    return role === 'Admin' || role === 'Super Admin';
  }
}
