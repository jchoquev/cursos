import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly storageKey = 'app-theme';
  private mediaQuery: MediaQueryList | null = null;

  readonly mode = signal<ThemeMode>('dark');
  readonly followsSystem = signal(true);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    // El tema público actual es oscuro. Se conserva la lógica de claro para
    // reactivarla en el futuro, pero no se permite que una preferencia antigua
    // o el tema del sistema cambien la interfaz visible.
    localStorage.removeItem(this.storageKey);
    this.mode.set('dark');
    this.followsSystem.set(false);

    this.apply();
  }

  toggle(): void {
    const next = this.mode() === 'dark' ? 'light' : 'dark';
    this.mode.set(next);
    this.followsSystem.set(false);
    localStorage.setItem(this.storageKey, next);
    this.apply();
  }

  useSystemTheme(): void {
    if (!this.mediaQuery) return;
    localStorage.removeItem(this.storageKey);
    this.followsSystem.set(true);
    this.mode.set(this.mediaQuery.matches ? 'dark' : 'light');
    this.apply();
  }

  private readonly handleSystemThemeChange = (event: MediaQueryListEvent): void => {
    if (!this.followsSystem()) return;
    this.mode.set(event.matches ? 'dark' : 'light');
    this.apply();
  };

  private apply(): void {
    const isLight = this.mode() === 'light';
    const root = this.document.documentElement;
    const body = this.document.body;

    root.classList.toggle('light-mode', isLight);
    root.classList.toggle('dark-mode', !isLight);
    body.classList.toggle('light-mode', isLight);
    body.classList.toggle('dark-mode', !isLight);
    root.style.colorScheme = this.mode();
  }
}
