import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SupportTicketUser {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface SupportTicketUpdateEntry {
  action: string;
  notes: string;
  createdAt: string;
  actor?: SupportTicketUser;
}

export interface SupportTicketAttachment {
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface SupportTicket {
  _id: string;
  ticketNumber: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  subject: string;
  message: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  updatedAt: string;
  createdBy?: SupportTicketUser;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: string;
  resolutionNotes?: string;
  assignedTo?: SupportTicketUser | null;
  updates?: SupportTicketUpdateEntry[];
  attachments?: SupportTicketAttachment[];
}

export interface CreateSupportTicketPayload {
  category: string;
  subject?: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

export interface UpdateSupportTicketPayload {
  status?: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolutionNotes?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
}

@Injectable({ providedIn: 'root' })
export class SupportService {
  private readonly baseUrl = `${environment.apiBaseUrl}/support`;

  constructor(private readonly http: HttpClient) {}

  createTicket(payload: CreateSupportTicketPayload, attachments: File[] = []): Observable<SupportTicket> {
    const formData = new FormData();
    formData.append('category', payload.category);
    formData.append('message', payload.message);
    formData.append('priority', payload.priority);
    if (payload.subject) {
      formData.append('subject', payload.subject);
    }
    attachments.forEach(file => {
      formData.append('attachments', file);
    });
    return this.http.post<SupportTicket>(this.baseUrl, formData, {
      headers: this.buildAuthHeaders()
    });
  }

  getMyTickets(): Observable<SupportTicket[]> {
    return this.http.get<SupportTicket[]>(`${this.baseUrl}/my`, {
      headers: this.buildAuthHeaders()
    });
  }

  getInbox(options?: { status?: string; assigned?: string }): Observable<SupportTicket[]> {
    let params = new HttpParams();
    if (options?.status) {
      params = params.set('status', options.status);
    }
    if (options?.assigned) {
      params = params.set('assigned', options.assigned);
    }
    return this.http.get<SupportTicket[]>(this.baseUrl, {
      headers: this.buildAuthHeaders(),
      params
    });
  }

  updateTicket(id: string, payload: UpdateSupportTicketPayload): Observable<SupportTicket> {
    return this.http.patch<SupportTicket>(`${this.baseUrl}/${id}`, payload, {
      headers: this.buildAuthHeaders()
    });
  }

  addComment(id: string, note: string): Observable<SupportTicket> {
    return this.http.post<SupportTicket>(`${this.baseUrl}/${id}/comment`, { note }, {
      headers: this.buildAuthHeaders()
    });
  }

  buildAttachmentUrl(attachment: SupportTicketAttachment): string {
    if (!attachment?.storedName) {
      return '';
    }
    const sanitized = attachment.storedName.replace(/\\+/g, '/').replace(/^\/+/, '');
    const encoded = sanitized
      .split('/')
      .filter(Boolean)
      .map(segment => encodeURIComponent(segment))
      .join('/');
    return `${environment.uploadsBaseUrl}/${encoded}`;
  }

  private buildAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headerValues: Record<string, string> = {};
    if (token) {
      headerValues['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headerValues);
  }
}
