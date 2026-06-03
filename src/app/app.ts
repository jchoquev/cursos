import { Component, inject, signal, computed, HostListener, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { PlatformService, EventItem, Certificate } from './services/platform.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly platformService = inject(PlatformService);
  readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);

  // Señal para identificar si la ruta actual es pública
  readonly isPublicRoute = signal<boolean>(true);

  // Theme toggle (light / dark) — persisted to localStorage
  themeMode = signal<'light' | 'dark'>('dark');

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        // Ocultar navbar/footer en rutas que inicien con /intranet
        const isIntranet = event.urlAfterRedirects.startsWith('/intranet');
        this.isPublicRoute.set(!isIntranet);

        if (isPlatformBrowser(this.platformId)) {
          // En intranet siempre quitar light-mode del body
          if (isIntranet) {
            document.body.classList.remove('light-mode');
          } else {
            this.applyTheme();
          }
        }
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Leer tema guardado del localStorage
      const saved = localStorage.getItem('app-theme') as 'light' | 'dark' | null;
      if (saved) {
        this.themeMode.set(saved);
      }
      this.applyTheme();
    }
  }

  toggleTheme(): void {
    const next = this.themeMode() === 'dark' ? 'light' : 'dark';
    this.themeMode.set(next);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('app-theme', next);
      this.applyTheme();
    }
  }

  private applyTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.themeMode() === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }

  // Sleek interactive modals
  showLiveModal = signal<boolean>(false);
  showPremiumModal = signal<boolean>(false);
  showSearchOverlay = signal<boolean>(false);
  showRutasModal = signal<boolean>(false);
  showEscuelasModal = signal<boolean>(false);
  showEmpresasModal = signal<boolean>(false);
  showEDlabsModal = signal<boolean>(false);
  showTrabajosModal = signal<boolean>(false);
  showMobileMenu = signal<boolean>(false);

  // Search variables
  navbarSearchQuery = signal<string>('');

  // HostListener for EDteam-like global search shortcut (Ctrl+K)
  @HostListener('window:keydown.control.k', ['$event'])
  handleKeyboardShortcut(event: any): void {
    event.preventDefault();
    this.openSearchOverlay();
  }

  openSearchOverlay(): void {
    this.showSearchOverlay.set(true);
  }

  closeSearchOverlay(): void {
    this.showSearchOverlay.set(false);
    this.navbarSearchQuery.set('');
  }

  // Real-time computed search results for both catalog courses and certificates
  readonly searchResults = computed(() => {
    const query = this.navbarSearchQuery().trim().toLowerCase();
    if (!query || query.length < 2) {
      return { courses: [], certificates: [] };
    }

    const courses = this.platformService.events().filter((c) =>
      c.title.toLowerCase().includes(query) ||
      c.instructor.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    );

    const certificates = this.platformService.certificates().filter((cert) =>
      cert.fullName.toLowerCase().includes(query) ||
      cert.dni.includes(query) ||
      cert.code.toLowerCase().includes(query)
    );

    return { courses, certificates };
  });
}
