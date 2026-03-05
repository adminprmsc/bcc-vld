import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AccessRequestService } from '../access-request.service';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'app-request-access',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule, MatButtonModule, MatIconModule],
  templateUrl: './request-access.html',
  styleUrl: './request-access.scss'
})
export class RequestAccess {
  fullName = '';
  email = '';
  phone = '';
  role = 'Citizen';
  tehsil = '';
  message = '';
  submitting = false;
  success = '';
  error = '';

  readonly roleOptions = [
    'Citizen',
    'DM Tehsil',
    'Infra Engineer',
    'CID',
    'BCC Specialist',
    'BCC Officer Tehsil',
    'EDCS Consultant',
    'EDCS User',
    'RA Environment',
    'PCRWR Sampler',
    'PCRWR Lab'
  ];

  constructor(private readonly accessRequestService: AccessRequestService, private readonly router: Router) {}

  submit(): void {
    if (!this.fullName || !this.email || !this.phone) {
      this.error = 'Full name, email, and phone are required.';
      this.success = '';
      return;
    }
    this.submitting = true;
    this.error = '';
    this.success = '';
    const payload = {
      name: this.fullName,
      email: this.email,
      phone: this.phone,
      roleRequested: this.role,
      tehsil: this.tehsil,
      message: this.message
    };
    this.accessRequestService.submit(payload).subscribe({
      next: res => {
        this.success = res?.msg || 'Request submitted. You will be notified once it is reviewed.';
        this.submitting = false;
        this.error = '';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      },
      error: err => {
        this.error = err?.error?.msg || 'Unable to submit request at this time.';
        this.submitting = false;
        this.success = '';
      }
    });
  }
}
