import { Component, inject, signal, computed, effect, HostListener, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { PlatformService, EventItem, Certificate } from './services/platform.service';
import { FormsModule } from '@angular/forms';
import { ThemeService } from './services/theme.service';
import { DnaLoaderService } from './services/dna-loader.service';
import { DnaLoaderComponent } from './components/dna-loader/dna-loader';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule, DnaLoaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly platformService = inject(PlatformService);
  readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  readonly themeService = inject(ThemeService);
  private readonly dnaLoader = inject(DnaLoaderService);

  // Señal para identificar si la ruta actual es pública
  readonly isPublicRoute = signal<boolean>(true);

  // Theme toggle (light / dark) — persisted to localStorage
  readonly themeMode = this.themeService.mode;

  // Identifica si estamos en el cliente para evitar Hydration Mismatch
  isBrowser = signal<boolean>(isPlatformBrowser(this.platformId));

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        const isIntranet = event.urlAfterRedirects.startsWith('/intranet');
        this.isPublicRoute.set(!isIntranet);
      }
    });

    // Wire platform loading state → DNA loader automatically
    effect(() => {
      if (this.platformService.isLoading()) {
        this.dnaLoader.show('Cargando', 'Sincronizando datos de la plataforma...');
      } else {
        this.dnaLoader.hide();
      }
    });
  }

  ngOnInit(): void {}

  toggleTheme(): void {
    this.themeService.toggle();
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
