import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { PlatformService, EventItem, Certificate } from './services/platform.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly platformService = inject(PlatformService);

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
