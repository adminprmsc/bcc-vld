import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { RequisitionsService } from '../requisitions/requisitions.service';
import { of } from 'rxjs';
import { switchMap, debounceTime, distinctUntilChanged, tap, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-picker',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatAutocompleteModule, MatButtonModule],
  templateUrl: './user-picker.html',
  styleUrls: ['./user-picker.scss']
})
export class UserPicker implements OnInit {
  control = new FormControl('');
  users: any[] = [];
  loading = false;
  @Output() selected = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();
  remarks: string = '';
  selectedUser: any = null;

  constructor(private requisitionsService: RequisitionsService) {}

  ngOnInit() {
    this.control.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap((value: any) => {
        if (!value || typeof value === 'string') {
          this.selectedUser = null;
        }
      }),
      tap(() => this.loading = true),
      switchMap((v: any) => {
        const q = typeof v === 'string' ? v : (v?.name || '');
        if (!q || q.length < 1) { this.loading = false; return of([]); }
        return this.requisitionsService.searchUsers(q).pipe(catchError(() => of([])));
      })
    ).subscribe((res: any[]) => { this.users = res || []; this.loading = false; });
  }

  displayFn(user: any) {
    return user ? `${user.name} (${user.role})` : '';
  }

  onSelect(user: any) {
    this.selectedUser = user;
  }

  onConfirm() {
    const user = this.selectedUser || (typeof this.control.value === 'object' ? this.control.value : null);
    const remarksText = (this.remarks || '').trim();
    if (!user) {
      alert('Please select a user to assign.');
      return;
    }
    if (!remarksText) {
      alert('Remarks are required.');
      return;
    }
    this.selected.emit({ user, remarks: remarksText });
    this.control.setValue('');
    this.selectedUser = null;
    this.remarks = '';
  }

  onCancel() {
    this.control.setValue('');
    this.selectedUser = null;
    this.remarks = '';
    this.cancel.emit();
  }
}
