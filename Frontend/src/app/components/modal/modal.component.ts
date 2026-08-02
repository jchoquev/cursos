import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
})
export class ModalComponent implements AfterViewInit, OnDestroy {
  readonly open = input(false);
  readonly title = input('');
  readonly description = input('');
  readonly labelledBy = input('modal-title');
  readonly describedBy = input('modal-description');
  readonly maxWidth = input('max-w-2xl');
  readonly panelClass = input('bg-white');
  readonly showHeader = input(true);
  readonly showFooter = input(true);

  readonly closed = output<void>();

  /**
   * El backdrop se renderiza inicialmente dentro del componente, pero se
   * mueve a <body> para que position: fixed siempre use el viewport. Esto
   * evita recortes causados por transform/filter/overflow en el dashboard.
   */
  @ViewChild('backdrop')
  private set backdrop(ref: ElementRef<HTMLElement> | undefined) {
    if (!this.browser || !ref) return;
    this.renderer.appendChild(this.document.body, ref.nativeElement);
  }

  @ViewChild('dialog', { static: false }) private dialog?: ElementRef<HTMLElement>;

  readonly rendered = signal(false);
  readonly closing = signal(false);

  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(Renderer2);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private originalOverflow: string | null = null;
  private returnFocus: HTMLElement | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      if (this.open()) {
        if (this.closeTimer) clearTimeout(this.closeTimer);
        this.returnFocus = this.browser ? this.document.activeElement as HTMLElement : null;
        this.rendered.set(true);
        this.closing.set(false);
        this.lockBodyScroll();
        this.focusDialog();
      } else if (this.rendered()) {
        this.startClosing();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.open()) this.focusDialog();
  }

  ngOnDestroy(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.restoreBodyScroll();
    this.returnFocus?.focus({ preventScroll: true });
  }

  requestClose(): void {
    if (!this.closing()) this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.requestClose();
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.rendered() || this.closing()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }
    if (event.key === 'Tab') this.trapFocus(event);
  }

  private startClosing(): void {
    this.closing.set(true);
    this.restoreBodyScroll();
    this.closeTimer = setTimeout(() => {
      this.rendered.set(false);
      this.closing.set(false);
      this.returnFocus?.focus({ preventScroll: true });
      this.returnFocus = null;
    }, 200);
  }

  private lockBodyScroll(): void {
    if (!this.browser || this.originalOverflow !== null) return;
    this.originalOverflow = this.document.body.style.overflow;
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
  }

  private restoreBodyScroll(): void {
    if (!this.browser || this.originalOverflow === null) return;
    this.renderer.setStyle(this.document.body, 'overflow', this.originalOverflow);
    this.originalOverflow = null;
  }

  private focusDialog(): void {
    if (!this.browser) return;
    setTimeout(() => {
      const element = this.dialog?.nativeElement;
      if (!element) return;
      const first = this.focusableElements(element)[0];
      (first ?? element).focus({ preventScroll: true });
    });
  }

  private trapFocus(event: KeyboardEvent): void {
    const element = this.dialog?.nativeElement;
    if (!element) return;
    const focusable = this.focusableElements(element);
    if (!focusable.length) {
      event.preventDefault();
      element.focus({ preventScroll: true });
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && this.document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ));
  }
}
