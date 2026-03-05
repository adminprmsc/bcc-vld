import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatOptionModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class Register {
  firstName = '';
  lastName = '';
  gender = '';
  cnic = '';
  cnicExpiry = '';
  address = '';
  dob = '';
  phone = '';
  email = '';
  password = '';
  confirmPassword = '';
  role = '';
  avatarUrl: string | null = null;
  signatureFile: File | null = null;
  error = '';
  success = '';

  constructor(private authService: AuthService, private router: Router) {
    const role = localStorage.getItem('role');
    if (role !== 'Admin' && role !== 'Super Admin') {
      this.router.navigate(['/']);
    }
  }

  onAvatarChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  onSignatureClick() {
    const input = document.querySelector<HTMLInputElement>('#signatureInput');
    if (input) input.click();
  }

  onSignatureChange(event: any) {
    this.signatureFile = event.target.files[0] || null;
  }

  onRegister() {
    if (!this.firstName || !this.email || !this.phone) {
      this.error = 'Name, email, and phone are required.';
      this.success = '';
      return;
    }
    this.error = '';
    this.success = '';
    // Prepare registration payload (only required fields)
    const payload: any = {
      name: this.firstName + (this.lastName ? ' ' + this.lastName : ''),
      email: this.email,
      phone: this.phone,
      role: this.role || 'Citizen',
      password: this.password || 'default123',
      // Optional fields
      gender: this.gender,
      cnic: this.cnic,
      cnicExpiry: this.cnicExpiry,
      address: this.address,
      dob: this.dob
    };
    this.authService.register(payload).subscribe({
      next: (res) => {
        this.success = res?.msg || 'User registered successfully.';
        this.error = '';
      },
      error: (err) => {
        this.error = err?.error?.msg || 'Registration failed.';
        this.success = '';
      }
    });
  }
}
