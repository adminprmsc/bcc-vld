import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type NotificationTone = 'info' | 'success' | 'warning' | 'critical';

export interface UserNotification {
  id: string;
  title?: string;
  message: string;
  createdAt: string;
  read: boolean;
  type: NotificationTone;
  context?: Record<string, any> | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notifications$ = new BehaviorSubject<UserNotification[]>([]);
  private activeUserId: string | null = null;

  initForUser(userId: string | null): void {
    this.activeUserId = userId;
    if (!userId) {
      this.notifications$.next([]);
      return;
    }
    const stored = localStorage.getItem(this.storageKey(userId));
    if (!stored) {
      this.notifications$.next([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored) as UserNotification[];
      const normalised = Array.isArray(parsed)
        ? parsed.map(item => ({
            ...item,
            createdAt: item.createdAt || new Date().toISOString(),
            read: Boolean(item.read),
            type: item.type || 'info'
          }))
        : [];
      this.notifications$.next(normalised);
    } catch {
      this.notifications$.next([]);
    }
  }

  stream(): Observable<UserNotification[]> {
    return this.notifications$.asObservable();
  }

  snapshot(): UserNotification[] {
    return this.notifications$.getValue();
  }

  unreadCount(): number {
    return this.snapshot().filter(item => !item.read).length;
  }

  push(message: string, options?: { title?: string; type?: NotificationTone; context?: Record<string, any> | null }): void {
    if (!message) {
      return;
    }
    const notification: UserNotification = {
      id: this.generateId(),
      title: options?.title,
      message,
      createdAt: new Date().toISOString(),
      read: false,
      type: options?.type || 'info',
      context: options?.context ?? null
    };
    const next = [notification, ...this.snapshot()].slice(0, 30);
    this.notifications$.next(next);
    this.persist();
  }

  markAsRead(id: string): void {
    const updated = this.snapshot().map(item => (item.id === id ? { ...item, read: true } : item));
    this.notifications$.next(updated);
    this.persist();
  }

  markAllAsRead(): void {
    const updated = this.snapshot().map(item => ({ ...item, read: true }));
    this.notifications$.next(updated);
    this.persist();
  }

  clear(): void {
    this.notifications$.next([]);
    this.persist();
  }

  private persist(): void {
    if (!this.activeUserId) {
      return;
    }
    try {
      localStorage.setItem(this.storageKey(this.activeUserId), JSON.stringify(this.snapshot()));
    } catch {
      /* ignore storage errors */
    }
  }

  private storageKey(userId: string): string {
    return `lds:notifications:${userId}`;
  }

  private generateId(): string {
    const hasCrypto = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    if (hasCrypto) {
      return crypto.randomUUID();
    }
    return `ntf-${Date.now().toString(36)}-${Math.floor(Math.random() * 10_000).toString(36)}`;
  }
}
