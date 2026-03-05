import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ErrorSeverity = 'warning' | 'error' | 'info';

export interface ErrorDetails {
  message: string;
  code?: string;
  details?: string;
  timestamp?: Date;
}

@Component({
  selector: 'app-error-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="error-container" 
      [class]="containerClasses()"
      role="alert"
      aria-live="assertive"
    >
      <div class="error-icon">
        @switch (severity()) {
          @case ('warning') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 9v4m0 4h.01M12 3l9 18H3L12 3z"/>
            </svg>
          }
          @case ('info') {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          }
          @default {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="15" y1="9" x2="9" y2="15"/>
              <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          }
        }
      </div>
      
      <div class="error-content">
        <h3 class="error-title">{{ title() || defaultTitle() }}</h3>
        <p class="error-message">{{ error().message }}</p>
        
        @if (error().code) {
          <p class="error-code">Error Code: {{ error().code }}</p>
        }
        
        @if (showDetails() && error().details) {
          <details class="error-details">
            <summary>Technical Details</summary>
            <pre>{{ error().details }}</pre>
          </details>
        }
      </div>
      
      <div class="error-actions">
        @if (dismissible()) {
          <button 
            type="button" 
            class="btn-dismiss" 
            (click)="onDismiss()"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        }
        
        @if (retryable()) {
          <button 
            type="button" 
            class="btn-retry"
            (click)="onRetry()"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 4v6h6M23 20v-6h-6"/>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
            </svg>
            Retry
          </button>
        }
      </div>
    </div>
  `,
  styles: [`
    .error-container {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem 1.25rem;
      border-radius: 0.5rem;
      border: 1px solid;
      
      &.error {
        background-color: #fef2f2;
        border-color: #fecaca;
        color: #991b1b;
        
        .error-icon { color: #dc2626; }
        .btn-retry { 
          background: #dc2626;
          &:hover { background: #b91c1c; }
        }
      }
      
      &.warning {
        background-color: #fffbeb;
        border-color: #fde68a;
        color: #92400e;
        
        .error-icon { color: #f59e0b; }
        .btn-retry {
          background: #f59e0b;
          &:hover { background: #d97706; }
        }
      }
      
      &.info {
        background-color: #eff6ff;
        border-color: #bfdbfe;
        color: #1e40af;
        
        .error-icon { color: #3b82f6; }
        .btn-retry {
          background: #3b82f6;
          &:hover { background: #2563eb; }
        }
      }
      
      &.fullscreen {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-width: 500px;
        width: 90%;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        z-index: 9999;
      }
      
      &.card {
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem;
        
        .error-icon { margin-bottom: 0.5rem; }
        .error-actions { margin-top: 1rem; }
      }
    }
    
    .error-icon {
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      
      svg {
        width: 100%;
        height: 100%;
      }
    }
    
    .error-content {
      flex: 1;
      min-width: 0;
    }
    
    .error-title {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    
    .error-message {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
    }
    
    .error-code {
      margin: 0.5rem 0 0 0;
      font-size: 0.75rem;
      opacity: 0.8;
      font-family: monospace;
    }
    
    .error-details {
      margin-top: 0.75rem;
      font-size: 0.75rem;
      
      summary {
        cursor: pointer;
        user-select: none;
        opacity: 0.8;
        
        &:hover { opacity: 1; }
      }
      
      pre {
        margin: 0.5rem 0 0 0;
        padding: 0.5rem;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 0.25rem;
        overflow-x: auto;
        font-size: 0.7rem;
        white-space: pre-wrap;
        word-break: break-word;
      }
    }
    
    .error-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }
    
    .btn-dismiss {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      background: transparent;
      border: none;
      cursor: pointer;
      opacity: 0.5;
      transition: opacity 0.2s;
      
      &:hover { opacity: 1; }
      
      svg {
        width: 1rem;
        height: 1rem;
      }
    }
    
    .btn-retry {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      color: white;
      border: none;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.2s;
      
      svg {
        width: 1rem;
        height: 1rem;
      }
    }
  `]
})
export class ErrorDisplay {
  // Inputs
  error = input.required<ErrorDetails>();
  severity = input<ErrorSeverity>('error');
  title = input<string>('');
  dismissible = input(true);
  retryable = input(false);
  showDetails = input(false);
  mode = input<'inline' | 'fullscreen' | 'card'>('inline');
  
  // Outputs
  dismiss = output<void>();
  retry = output<void>();
  
  // Computed
  containerClasses = computed(() => `${this.severity()} ${this.mode()}`);
  
  defaultTitle = computed(() => {
    switch (this.severity()) {
      case 'warning': return 'Warning';
      case 'info': return 'Information';
      default: return 'Error';
    }
  });
  
  onDismiss(): void {
    this.dismiss.emit();
  }
  
  onRetry(): void {
    this.retry.emit();
  }
}
