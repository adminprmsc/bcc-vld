import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  email = '';
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.email || !this.password) {
      this.error = 'Email and password are required.';
      return;
    }
    this.error = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
          const payload = JSON.parse(atob(res.token.split('.')[1]));
          const profile = res.user || {};
          const role = profile.role || payload.role || '';
          const roleNormalized = (role || '').replace(/\s+/g, '').toLowerCase();
          localStorage.setItem('role', role);
          localStorage.setItem('user', JSON.stringify({
            id: profile.id || payload.userId,
            name: profile.name || '',
            email: profile.email || '',
            role,
            gender: profile.gender || '',
            cnic: profile.cnic || '',
            cnicExpiry: profile.cnicExpiry || '',
            address: profile.address || '',
            dob: profile.dob || '',
            phone: profile.phone || '',
            activeStatus: profile.activeStatus || ''
          }));
          const adminLandingRoles = ['admin', 'superadmin'];
          const tehsilRoles = ['tehsildm', 'dmtehsil'];
          const waterQualityLandingRoles = ['raenvironment', 'pcrwrsampler', 'pcrwrlab'];
          if (adminLandingRoles.includes(roleNormalized)) {
            this.router.navigate(['/support']);
          } else if (tehsilRoles.includes(roleNormalized)) {
            this.router.navigate(['/tehsil-dm-dashboard']);
          } else if (waterQualityLandingRoles.includes(roleNormalized)) {
            this.router.navigate(['/water-quality-dashboard']);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (err) => {
        this.error = err?.error?.msg || 'Login failed.';
      }
    });
  }
}
