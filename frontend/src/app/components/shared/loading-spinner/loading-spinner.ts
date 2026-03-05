import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'light' | 'dark';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loading-container" [class]="containerClasses()">
      <div class="spinner" [class]="spinnerClasses()" role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle 
            class="spinner-track" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            stroke-width="2.5"
          />
          <path 
            class="spinner-arc" 
            d="M12 2C6.48 2 2 6.48 2 12" 
            stroke="currentColor" 
            stroke-width="2.5" 
            stroke-linecap="round"
          />
        </svg>
      </div>
      @if (message()) {
        <p class="loading-message">{{ message() }}</p>
      }
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      
      &.fullscreen {
        position: fixed;
        inset: 0;
        background: rgba(255, 255, 255, 0.9);
        z-index: 9999;
      }
      
      &.overlay {
        position: absolute;
        inset: 0;
        background: rgba(255, 255, 255, 0.8);
        z-index: 100;
      }
      
      &.inline {
        padding: 1rem;
      }
    }
    
    .spinner {
      animation: spin 1s linear infinite;
      
      svg {
        width: 100%;
        height: 100%;
      }
      
      &.sm { width: 1rem; height: 1rem; }
      &.md { width: 2rem; height: 2rem; }
      &.lg { width: 3rem; height: 3rem; }
      &.xl { width: 4rem; height: 4rem; }
      
      &.primary {
        color: #3b82f6;
        .spinner-track { opacity: 0.2; }
      }
      
      &.secondary {
        color: #6b7280;
        .spinner-track { opacity: 0.2; }
      }
      
      &.light {
        color: #ffffff;
        .spinner-track { opacity: 0.3; }
      }
      
      &.dark {
        color: #1f2937;
        .spinner-track { opacity: 0.2; }
      }
    }
    
    .spinner-track {
      opacity: 0.2;
    }
    
    .loading-message {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
      text-align: center;
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoadingSpinner {
  // Inputs
  size = input<SpinnerSize>('md');
  variant = input<SpinnerVariant>('primary');
  message = input<string>('');
  mode = input<'inline' | 'overlay' | 'fullscreen'>('inline');
  
  // Computed classes
  containerClasses = computed(() => this.mode());
  
  spinnerClasses = computed(() => {
    return `${this.size()} ${this.variant()}`;
  });
}
