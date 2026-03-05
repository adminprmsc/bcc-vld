import {
  Component,
  ContentChild,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  TemplateRef,
  ViewChild,
  ViewEncapsulation,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Reusable base modal component with built-in UX optimizations:
 * - Smooth slide-in/out animations
 * - Keyboard support (Escape to close)
 * - Focus management
 * - Accessibility features (ARIA labels, semantic HTML)
 * - Responsive design
 * - Reduced motion support
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <div
      class="modal-overlay"
      *ngIf="isOpen"
      (click)="onBackdropClick()"
      [attr.aria-hidden]="!isOpen"
      role="presentation"
    ></div>

    <div
      class="modal-container"
      *ngIf="isOpen"
      role="dialog"
      [attr.aria-labelledby]="titleId"
      [attr.aria-modal]="true"
      [attr.aria-hidden]="!isOpen"
    >
      <div class="modal-header">
        <h2 [id]="titleId" class="modal-title">{{ title }}</h2>
        <button
          type="button"
          class="modal-close-btn"
          (click)="close()"
          aria-label="Close modal"
          title="Close (Esc)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="modal-body" [class.has-custom-content]="hasCustomContent">
        <ng-container *ngIf="bodyTemplate; else defaultContent">
          <ng-container *ngTemplateOutlet="bodyTemplate"></ng-container>
        </ng-container>
        <ng-template #defaultContent>
          <p *ngIf="content" class="modal-default-content">{{ content }}</p>
        </ng-template>
      </div>

      <div class="modal-footer" *ngIf="hasFooter">
        <ng-container *ngIf="footerTemplate; else defaultFooter">
          <ng-container *ngTemplateOutlet="footerTemplate"></ng-container>
        </ng-container>
        <ng-template #defaultFooter>
          <button type="button" class="btn secondary" (click)="close()" *ngIf="showCancelButton">
            {{ cancelButtonText }}
          </button>
          <button
            type="button"
            class="btn primary"
            (click)="confirm()"
            *ngIf="showConfirmButton"
            [disabled]="confirmDisabled"
          >
            {{ confirmButtonText }}
          </button>
        </ng-template>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --modal-z-index: 1000;
      --modal-animation-duration: 300ms;
      --modal-backdrop-color: rgba(0, 0, 0, 0.5);
      --modal-border-radius: 8px;
      --modal-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      --modal-max-width: 600px;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--modal-backdrop-color);
      z-index: calc(var(--modal-z-index) - 1);
      animation: fadeIn 200ms ease-in forwards;
    }

    .modal-container {
      position: fixed;
      top: 0;
      right: 0;
      width: 100%;
      max-width: var(--modal-max-width);
      height: 100%;
      max-height: 100vh;
      background: white;
      border-radius: var(--modal-border-radius) 0 0 var(--modal-border-radius);
      box-shadow: var(--modal-shadow);
      z-index: var(--modal-z-index);
      display: flex;
      flex-direction: column;
      outline: none;
      overflow: hidden;
      animation: slideIn 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #e5e7eb;
      flex-shrink: 0;
    }

    .modal-title {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .modal-close-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      &:focus {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }

      svg {
        width: 20px;
        height: 20px;
      }
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      color: #374151;
      font-size: 14px;
      line-height: 1.5;

      &.has-custom-content {
        padding: 0;
      }
    }

    .modal-default-content {
      margin: 0;
      color: #4b5563;
      line-height: 1.6;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 20px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      flex-shrink: 0;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;

      &.primary {
        background: #2563eb;
        color: white;

        &:hover:not(:disabled) {
          background: #1d4ed8;
        }

        &:active:not(:disabled) {
          background: #1e40af;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      }

      &.secondary {
        background: white;
        color: #374151;
        border: 1px solid #d1d5db;

        &:hover {
          background: #f3f4f6;
        }

        &:active {
          background: #e5e7eb;
        }
      }

      &:focus {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }
    }

    @media (max-width: 768px) {
      .modal-container {
        max-width: 100%;
        width: 100%;
        border-radius: 8px 8px 0 0;
        bottom: 0;
        top: auto;
        max-height: 90vh;
      }

      .modal-header {
        padding: 16px;
      }

      .modal-body {
        padding: 16px;
      }

      .modal-footer {
        padding: 12px 16px;
        gap: 10px;
      }
    }

    @media (max-width: 480px) {
      .modal-title {
        font-size: 16px;
      }

      .modal-footer {
        flex-wrap: wrap;
      }

      .btn {
        flex: 1;
        min-width: 100px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        --modal-animation-duration: 0ms;
      }

      .modal-overlay,
      .modal-container {
        animation: none !important;
        transition: none !important;
      }
    }
  `],
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Input() title = 'Modal';
  @Input() content: string | null = null;
  @Input() showCancelButton = true;
  @Input() showConfirmButton = true;
  @Input() cancelButtonText = 'Cancel';
  @Input() confirmButtonText = 'Confirm';
  @Input() confirmDisabled = false;
  @Input() closeOnBackdropClick = true;
  @Input() closeOnEscapeKey = true;

  @Output() readonly closed = new EventEmitter<void>();
  @Output() readonly confirmed = new EventEmitter<void>();

  @ViewChild('bodyTemplate', { static: false }) bodyTemplate?: TemplateRef<any>;
  @ViewChild('footerTemplate', { static: false }) footerTemplate?: TemplateRef<any>;
  @ContentChild('modalBody') customBodyTemplate?: TemplateRef<any>;
  @ContentChild('modalFooter') customFooterTemplate?: TemplateRef<any>;

  readonly titleId = `modal-title-${Math.random().toString(36).substring(7)}`;

  get hasCustomContent(): boolean {
    return !!this.customBodyTemplate;
  }

  get hasFooter(): boolean {
    return this.showCancelButton || this.showConfirmButton || !!this.customFooterTemplate;
  }

  ngOnInit(): void {
    if (this.isOpen) {
      this.setupKeyboardListener();
      this.focusModal();
    }
  }

  ngOnDestroy(): void {
    this.removeKeyboardListener();
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
    this.removeKeyboardListener();
  }

  confirm(): void {
    this.confirmed.emit();
    this.close();
  }

  onBackdropClick(): void {
    if (this.closeOnBackdropClick) {
      this.close();
    }
  }

  private setupKeyboardListener(): void {
    document.addEventListener('keydown', this.handleKeydown);
  }

  private removeKeyboardListener(): void {
    document.removeEventListener('keydown', this.handleKeydown);
  }

  private readonly handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && this.closeOnEscapeKey && this.isOpen) {
      event.preventDefault();
      this.close();
    }
  };

  private focusModal(): void {
    // Focus management for accessibility
    setTimeout(() => {
      const closeBtn = document.querySelector(`[aria-label="Close modal"]`) as HTMLElement;
      if (closeBtn) {
        closeBtn.focus();
      }
    }, 100);
  }
}
