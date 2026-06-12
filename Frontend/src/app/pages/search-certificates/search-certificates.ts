import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, Certificate } from '../../services/platform.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import qrcode from 'qrcode-generator';

@Component({
  selector: 'app-search-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-certificates.html',
  styleUrl: './search-certificates.css',
})
export class SearchCertificates {
  private readonly platformService = inject(PlatformService);
  private readonly sanitizer = inject(DomSanitizer);

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
  getQrCodeSvgRaw(code: string): string {
    // Generate a beautiful, authentic SVG QR code block
    // Pointing to verification URL: https://iestpchojata.edu.pe/certificados/validador?code=code
    const url = `https://iestpchojata.edu.pe/certificados/validador?code=${encodeURIComponent(code)}`;
    
    try {
      // 0 means auto-detect version, 'M' is error correction level (Medium)
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      // Generate SVG string (cell size = 4, margin = 0)
      const svgString = qr.createSvgTag(4, 0);
      // Make the generated SVG responsive and stylable
      return svgString
        .replace('<svg', '<svg class="w-full h-full text-slate-800"')
        .replace(/fill="white"/g, 'fill="white"') // Keep white background
        .replace(/fill="black"/g, 'fill="currentColor"'); // Use currentColor for QR bits
    } catch (e) {
      console.error('Error generating QR code:', e);
      return '';
    }
  }

  getQrCodeSvg(code: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getQrCodeSvgRaw(code));
  }
}
