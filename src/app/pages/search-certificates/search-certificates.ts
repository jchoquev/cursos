import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, Certificate } from '../../services/platform.service';

@Component({
  selector: 'app-search-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-certificates.html',
  styleUrl: './search-certificates.css',
})
export class SearchCertificates {
  private readonly platformService = inject(PlatformService);

  // Search fields
  searchType = signal<'dni' | 'code'>('dni');
  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  // Results
  results = signal<Certificate[]>([]);

  // Active Certificate for Modal View
  activeCertificate = signal<Certificate | null>(null);

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

  // Perform search
  onSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.hasSearched.set(false);

    // Simulate short institutional delay for premium feel
    setTimeout(() => {
      if (this.searchType() === 'dni') {
        const found = this.platformService.findCertificatesByDni(query);
        this.results.set(found);
      } else {
        const found = this.platformService.findCertificateByCode(query);
        this.results.set(found ? [found] : []);
      }
      this.isSearching.set(false);
      this.hasSearched.set(true);
    }, 600);
  }

  // Open modal
  viewCertificate(cert: Certificate): void {
    this.showPrintCertModal.set(false);
    this.showResolutionModal.set(false);
    this.activeCertificate.set(cert);
  }

  // Close modal
  closeCertificateModal(): void {
    this.activeCertificate.set(null);
  }

  // Download / Print Certificate
  downloadCertificate(): void {
    window.print();
  }

  // Open modal and trigger print after rendering
  viewAndDownload(cert: Certificate): void {
    this.viewCertificate(cert);
    this.showPrintCertModal.set(true); // force diploma view for printing
    setTimeout(() => {
      this.downloadCertificate();
    }, 200);
  }

  // Resolution modal controls
  viewResolutionPdf(cert: Certificate): void {
    this.showResolutionModal.set(true);
  }

  closeResolutionPdf(): void {
    this.showResolutionModal.set(false);
  }

  // Dynamic QR Code SVG generator helper
  getQrCodeSvg(code: string): string {
    // Generate a beautiful, authentic SVG QR code block
    // Pointing to verification URL: https://iestpchojata.edu.pe/verificar?code=code
    const url = `https://iestpchojata.edu.pe/certificados/validador?code=${encodeURIComponent(code)}`;
    
    // We will return a beautiful, highly detailed mockup SVG QR Code
    // that looks like a real 2D matrix, showing structural elements, locator boxes, and custom aesthetic branding.
    return `
      <svg viewBox="0 0 100 100" class="w-full h-full text-slate-800" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="white" rx="6" />
        <!-- Locator box Top-Left -->
        <rect x="10" y="10" width="22" height="22" fill="currentColor" />
        <rect x="13" y="13" width="16" height="16" fill="white" />
        <rect x="16" y="16" width="10" height="10" fill="currentColor" />
        
        <!-- Locator box Top-Right -->
        <rect x="68" y="10" width="22" height="22" fill="currentColor" />
        <rect x="71" y="13" width="16" height="16" fill="white" />
        <rect x="74" y="16" width="10" height="10" fill="currentColor" />
        
        <!-- Locator box Bottom-Left -->
        <rect x="10" y="68" width="22" height="22" fill="currentColor" />
        <rect x="13" y="71" width="16" height="16" fill="white" />
        <rect x="16" y="74" width="10" height="10" fill="currentColor" />
        
        <!-- Small alignment block Bottom-Right -->
        <rect x="72" y="72" width="8" height="8" fill="currentColor" />
        <rect x="74" y="74" width="4" height="4" fill="white" />
        <rect x="75" y="75" width="2" height="2" fill="currentColor" />

        <!-- Mock data bits spread across matrix -->
        <g fill="currentColor">
          <rect x="36" y="10" width="4" height="4" /><rect x="44" y="12" width="6" height="4" /><rect x="54" y="10" width="4" height="4" />
          <rect x="38" y="18" width="4" height="4" /><rect x="48" y="20" width="4" height="4" /><rect x="58" y="18" width="4" height="6" />
          <rect x="36" y="26" width="8" height="4" /><rect x="48" y="28" width="6" height="4" /><rect x="58" y="26" width="4" height="4" />
          
          <rect x="10" y="36" width="4" height="4" /><rect x="20" y="38" width="6" height="4" /><rect x="30" y="36" width="4" height="8" />
          <rect x="12" y="44" width="4" height="4" /><rect x="22" y="46" width="4" height="4" /><rect x="32" y="48" width="8" height="4" />
          <rect x="10" y="52" width="8" height="4" /><rect x="24" y="54" width="6" height="4" /><rect x="34" y="54" width="4" height="4" />

          <rect x="42" y="36" width="8" height="4" /><rect x="54" y="36" width="4" height="6" /><rect x="64" y="38" width="8" height="4" /><rect x="76" y="36" width="14" height="4" />
          <rect x="44" y="44" width="4" height="4" /><rect x="52" y="46" width="8" height="4" /><rect x="66" y="44" width="4" height="8" /><rect x="74" y="46" width="4" height="4" /><rect x="82" y="44" width="8" height="4" />
          <rect x="42" y="52" width="6" height="4" /><rect x="54" y="54" width="4" height="4" /><rect x="62" y="54" width="8" height="4" /><rect x="76" y="54" width="4" height="4" /><rect x="84" y="52" width="6" height="4" />

          <rect x="36" y="62" width="4" height="8" /><rect x="44" y="64" width="8" height="4" /><rect x="56" y="62" width="4" height="4" /><rect x="64" y="64" width="6" height="4" /><rect x="74" y="62" width="4" height="4" /><rect x="84" y="62" width="6" height="4" />
          <rect x="38" y="74" width="6" height="4" /><rect x="48" y="72" width="4" height="4" /><rect x="54" y="74" width="8" height="4" /><rect x="64" y="74" width="4" height="4" /><rect x="84" y="72" width="6" height="4" />
          <rect x="36" y="82" width="4" height="4" /><rect x="44" y="84" width="8" height="4" /><rect x="56" y="82" width="4" height="6" /><rect x="64" y="84" width="6" height="4" /><rect x="74" y="82" width="10" height="4" />
          
          <rect x="10" y="90" width="12" height="4" /><rect x="26" y="90" width="4" height="4" /><rect x="34" y="92" width="8" height="4" /><rect x="46" y="90" width="6" height="4" /><rect x="56" y="90" width="8" height="4" /><rect x="68" y="90" width="4" height="4" /><rect x="76" y="92" width="14" height="4" />
        </g>
        <!-- Tiny shield logo overlay in center for premium institute look -->
        <rect x="43" y="43" width="14" height="14" fill="white" rx="2" />
        <path d="M46 46 L54 46 L54 51 Q54 55 50 56 Q46 55 46 51 Z" fill="#5c0a1e" />
        <text x="50" y="52" font-size="5" font-weight="bold" fill="white" text-anchor="middle">I</text>
      </svg>
    `;
  }
}
