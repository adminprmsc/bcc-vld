import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserUpdate } from '../users/user-update';
import { NotificationService, UserNotification } from './notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, UserUpdate],
  templateUrl: './app-header.html',
  styleUrl: './app-header.scss'
})
export class AppHeader implements OnInit, OnDestroy {
  @Input() appName: string = 'Voluntary Land Donation Portal';
  @Input() set user(value: any) {
    if (value) {
      this.currentUser.set(value);
      this.bootstrapNotifications(value);
    }
  }
  @Output() logout = new EventEmitter<void>();
  @Output() updateProfile = new EventEmitter<void>();
  showLogoutConfirm: boolean = false;
  showProfileUpdate: boolean = false;
  showNotifications = false;
  protected readonly currentUser = signal<any>(null);
  protected readonly notifications = signal<UserNotification[]>([]);
  protected readonly unreadCount = computed(() => this.notifications().filter(item => !item.read).length);
  protected readonly userInitials = computed(() => {
    const user = this.currentUser();
    if (!user?.name) return 'GU';
    return user.name
      .split(' ')
      .filter(Boolean)
      .map((part: string) => part[0]?.toUpperCase() ?? '')
      .join('')
      .substring(0, 2) || 'GU';
  });
  protected readonly userRoleLabel = computed(() => {
    const role = this.currentUser()?.role;
    return role ? role.replace(/_/g, ' ') : 'Guest User';
  });
  protected readonly notificationService = inject(NotificationService);
  private notificationsBound = false;
  private notificationSub: Subscription | null = null;

  ngOnInit(): void {
    if (!this.currentUser()) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          this.currentUser.set(JSON.parse(stored));
        } catch {
          this.currentUser.set(null);
        }
      }
    }
    this.bootstrapNotifications(this.currentUser());
  }

  ngOnDestroy(): void {
    if (this.notificationSub) {
      this.notificationSub.unsubscribe();
      this.notificationSub = null;
    }
  }

  onLogout() {
    this.showLogoutConfirm = false;
    this.logout.emit();
  }

  confirmLogout() {
    this.showLogoutConfirm = true;
  }

  onUpdateProfile() {
    this.showProfileUpdate = true;
    this.updateProfile.emit();
  }

  onProfileSaved(updated: any) {
    if (updated) {
      const current = this.currentUser() || {};
      const merged = { ...current, ...updated };
      this.currentUser.set(merged);
      try {
        localStorage.setItem('user', JSON.stringify(merged));
      } catch {
        /* ignore storage errors */
      }
    }
    this.showProfileUpdate = false;
  }

  onProfileModalClosed() {
    this.showProfileUpdate = false;
  }

  toggleNotifications() {
    this.showNotifications = !this.showNotifications;
  }

  clearNotifications() {
    this.notificationService.clear();
  }

  markAllNotificationsRead() {
    this.notificationService.markAllAsRead();
  }

  notificationTrackBy(_: number, item: UserNotification) {
    return item.id;
  }

  formatNotificationDate(value: string): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString();
  }

  private bootstrapNotifications(user: any) {
    const id = user?._id || user?.id || user?.userId || null;
    this.notificationService.initForUser(id);
    if (!this.notificationsBound) {
      this.notificationSub = this.notificationService.stream().subscribe(items => this.notifications.set(items));
      this.notificationsBound = true;
    } else if (this.notificationSub === null) {
      this.notificationSub = this.notificationService.stream().subscribe(items => this.notifications.set(items));
    }
  }
}
