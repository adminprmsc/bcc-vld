import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateSupportTicketPayload, SupportService, SupportTicket, SupportTicketAttachment } from './support.service';

interface TicketCategoryOption {
  label: string;
  value: string;
}

interface TicketPriorityOption {
  label: string;
  value: 'low' | 'medium' | 'high';
}

@Component({
  selector: 'app-support-center',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './support-center.html',
  styleUrls: ['./support-center.scss']
})
export class SupportCenter implements OnInit {
  private readonly supportService = inject(SupportService);
  private readonly fb = inject(FormBuilder);
  @ViewChild('attachmentInput') attachmentInput?: ElementRef<HTMLInputElement>;

  readonly categories: TicketCategoryOption[] = [
    { label: 'Access Issue', value: 'Access' },
    { label: 'Bug or Error', value: 'Bug' },
    { label: 'Data Update', value: 'Data' },
    { label: 'Workflow / Process', value: 'Workflow' },
    { label: 'Other', value: 'Other' }
  ];

  readonly priorities: TicketPriorityOption[] = [
    { label: 'Low', value: 'low' },
    { label: 'Medium', value: 'medium' },
    { label: 'High', value: 'high' }
  ];

  readonly statusOptions: { label: string; value: 'open' | 'in_progress' | 'resolved' | 'closed' }[] = [
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' }
  ];

  readonly statusLabels: Record<SupportTicket['status'], string> = {
    open: 'Open',
    in_progress: 'In Progress',
    resolved: 'Resolved',
    closed: 'Closed'
  };

  readonly ticketForm = this.fb.nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(140)]],
    category: ['Access', Validators.required],
    priority: ['medium', Validators.required],
    message: ['', [Validators.required, Validators.minLength(10)]]
  });

  readonly isSubmitting = signal(false);
  readonly loadingMine = signal(false);
  readonly loadingAssigned = signal(false);
  readonly loadingTeam = signal(false);

  readonly myTickets = signal<SupportTicket[]>([]);
  readonly assignedTickets = signal<SupportTicket[]>([]);
  readonly teamTickets = signal<SupportTicket[]>([]);
  readonly attachments = signal<File[]>([]);

  readonly currentRole = signal(this.resolveRole());
  readonly currentUserId = signal(this.resolveUserId());

  ngOnInit(): void {
    this.loadMyTickets();
    if (this.isAdmin()) {
      this.loadAssignedTickets();
      this.loadTeamTickets();
    }
  }

  submitTicket(): void {
    if (this.ticketForm.invalid || this.isSubmitting()) {
      this.ticketForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    const raw = this.ticketForm.getRawValue();
    const payload: CreateSupportTicketPayload = {
      subject: raw.subject,
      category: raw.category,
      priority: raw.priority as CreateSupportTicketPayload['priority'],
      message: raw.message
    };
    const files = this.attachments();
    this.supportService.createTicket(payload, files).subscribe({
      next: ticket => {
        this.isSubmitting.set(false);
        this.ticketForm.reset({ category: 'Access', priority: 'medium', subject: '', message: '' });
        this.attachments.set([]);
        if (this.attachmentInput?.nativeElement) {
          this.attachmentInput.nativeElement.value = '';
        }
        this.myTickets.update(current => [ticket, ...current]);
        alert(`Request ${ticket.ticketNumber} submitted to the admin team.`);
        if (this.isAdmin()) {
          this.loadAssignedTickets();
          this.loadTeamTickets();
        }
      },
      error: () => {
        this.isSubmitting.set(false);
        alert('Unable to submit support request. Please try again.');
      }
    });
  }

  onAttachmentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }
    const existing = this.attachments();
    const selected = Array.from(input.files);
    const combined = [...existing, ...selected];
    const deduped = combined.filter((file, index, array) => index === array.findIndex(candidate => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified));
    if (deduped.length !== combined.length) {
      alert('Duplicate attachments removed.');
    }
    if (deduped.length > 5) {
      alert('You can upload up to 5 attachments per ticket.');
    }
    this.attachments.set(deduped.slice(0, 5));
    input.value = '';
  }

  removeAttachment(index: number): void {
    const current = this.attachments();
    if (index < 0 || index >= current.length) {
      return;
    }
    const updated = current.slice(0, index).concat(current.slice(index + 1));
    this.attachments.set(updated);
  }

  attachmentUrl(attachment: SupportTicketAttachment): string {
    return this.supportService.buildAttachmentUrl(attachment);
  }

  formatBytes(size: number): string {
    if (!size || size <= 0) {
      return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const num = size / Math.pow(1024, exponent);
    return `${num.toFixed(num >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
  }

  loadMyTickets(): void {
    this.loadingMine.set(true);
    this.supportService.getMyTickets().subscribe({
      next: tickets => {
        this.myTickets.set(tickets || []);
        this.loadingMine.set(false);
      },
      error: () => {
        this.loadingMine.set(false);
        alert('Unable to load your support tickets.');
      }
    });
  }

  loadAssignedTickets(): void {
    this.loadingAssigned.set(true);
    this.supportService.getInbox({ assigned: 'me' }).subscribe({
      next: tickets => {
        this.assignedTickets.set(tickets || []);
        this.loadingAssigned.set(false);
      },
      error: () => {
        this.loadingAssigned.set(false);
        alert('Unable to load assigned support tickets.');
      }
    });
  }

  loadTeamTickets(): void {
    this.loadingTeam.set(true);
    this.supportService.getInbox({ status: 'open' }).subscribe({
      next: tickets => {
        const currentUserId = this.currentUserId();
        const filtered = (tickets || []).filter(ticket => {
          if (ticket.status !== 'open') {
            return false;
          }
          if (!currentUserId) {
            return true;
          }
          return ticket.assignedTo?._id !== currentUserId;
        });
        this.teamTickets.set(filtered);
        this.loadingTeam.set(false);
      },
      error: () => {
        this.loadingTeam.set(false);
        alert('Unable to load open support tickets right now.');
      }
    });
  }

  onStatusChange(ticket: SupportTicket, event: Event): void {
    const newStatus = (event.target as HTMLSelectElement).value as SupportTicket['status'];
    this.updateStatus(ticket, newStatus);
  }

  updateStatus(ticket: SupportTicket, status: SupportTicket['status']): void {
    if (ticket.status === status) {
      return;
    }
    this.supportService.updateTicket(ticket._id, { status }).subscribe({
      next: updated => {
        this.assignedTickets.update(current => current.map(item => (item._id === updated._id ? updated : item)));
        this.teamTickets.update(current => {
          const currentUserId = this.currentUserId();
          return current
            .map(item => (item._id === updated._id ? updated : item))
            .filter(item => item.status === 'open')
            .filter(item => !currentUserId || item.assignedTo?._id !== currentUserId);
        });
      },
      error: () => alert('Unable to update ticket status right now.')
    });
  }

  statusLabel(status: SupportTicket['status']): string {
    return this.statusLabels[status] ?? status;
  }

  addInternalNote(ticket: SupportTicket, noteInput: HTMLTextAreaElement): void {
    const value = noteInput.value.trim();
    if (!value) {
      return;
    }
    this.supportService.addComment(ticket._id, value).subscribe({
      next: updated => {
        this.assignedTickets.update(current => current.map(item => (item._id === updated._id ? updated : item)));
        this.teamTickets.update(current => current.map(item => (item._id === updated._id ? updated : item)));
        noteInput.value = '';
      },
      error: () => alert('Unable to post note to this ticket.')
    });
  }

  isAdmin(): boolean {
    const role = this.currentRole();
    return role === 'Admin' || role === 'Super Admin';
  }

  private resolveRole(): string {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        return '';
      }
      const parsed = JSON.parse(stored);
      return parsed?.role || '';
    } catch {
      return '';
    }
  }

  private resolveUserId(): string {
    try {
      const stored = localStorage.getItem('user');
      if (!stored) {
        return '';
      }
      const parsed = JSON.parse(stored);
      return parsed?.id || parsed?._id || '';
    } catch {
      return '';
    }
  }
}
