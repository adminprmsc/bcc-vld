import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-user-update',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-update.html',
  styleUrl: './user-update.scss'
})
export class UserUpdate {
  @Input() user: any;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();
  updatedUser: any = {};
  saving = false;
  error = '';
  success = '';
  newPassword = '';
  confirmPassword = '';
  private authService = inject(AuthService) as AuthService;

  ngOnInit() {
    this.updatedUser = { ...this.user };
    this.newPassword = '';
    this.confirmPassword = '';
  }

  save() {
    if (!this.updatedUser?.name || !this.updatedUser?.email) {
      this.error = 'Name and email are required to update your profile.';
      this.success = '';
      return;
    }
    const trimmedPassword = (this.newPassword || '').trim();
    const trimmedConfirm = (this.confirmPassword || '').trim();
    if (trimmedPassword || trimmedConfirm) {
      if (trimmedPassword.length < 6) {
        this.error = 'New password must be at least 6 characters long.';
        this.success = '';
        return;
      }
      if (trimmedPassword !== trimmedConfirm) {
        this.error = 'The confirmation password does not match.';
        this.success = '';
        return;
      }
    }
    this.error = '';
    this.success = '';
    this.saving = true;
    const payload: any = { ...this.updatedUser };
    if (trimmedPassword) {
      payload.password = trimmedPassword;
    }
    (this.authService as AuthService).updateUser(payload).subscribe({
      next: (res) => {
        this.saving = false;
        const merged = { ...this.updatedUser, ...(res || {}) };
        delete merged.password;
        this.updatedUser = merged;
        this.success = trimmedPassword ? 'Profile and password updated successfully.' : 'Profile updated successfully.';
        this.saved.emit(merged);
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: err => {
        this.saving = false;
        this.error = err?.error?.msg || 'Unable to update profile. Please try again.';
      }
    });
  }

  cancel() {
    this.close.emit();
  }
}
