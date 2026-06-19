import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { DnaLoaderService } from '../../services/dna-loader.service';
import qrcode from 'qrcode-generator';

export interface CertResult {
  valido: boolean;
  codigo: string;
  nombres: string;
  dni: string;
  evento: string;
  evento_id?: string;
  tipo_asistente_id?: number;
  horas: number;
  fecha: string | null;
  tipo: string;
  resolucion?: string | null;
  mensaje?: string;
}

@Component({
  selector: 'app-search-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-certificates.html',
  styleUrl: './search-certificates.css',
})
export class SearchCertificates {
  private readonly apiService = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly dnaLoader = inject(DnaLoaderService);

  searchQuery = signal<string>('');
  isSearching = signal<boolean>(false);
  hasSearched = signal<boolean>(false);

  result = signal<CertResult | null>(null);
  isValid = signal<boolean>(false);
  errorMsg = signal<string>('');

  showPrintModal = signal<boolean>(false);
  showResolutionModal = signal<boolean>(false);
  resolucionPdfUrl = signal<SafeResourceUrl | null>(null);
  resolucionError = signal<string>('');

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.hasSearched.set(false);
    this.result.set(null);
    this.isValid.set(false);
    this.errorMsg.set('');

    this.apiService.get<CertResult>(`/validar-certificado/${encodeURIComponent(query)}`).subscribe({
      next: (res) => {
        this.result.set(res);
        this.isValid.set(res.valido);
        this.isSearching.set(false);
        this.hasSearched.set(true);
      },
      error: (err) => {
        const msg = err?.error?.mensaje || 'No se encontró ningún certificado con ese código.';
        this.errorMsg.set(msg);
        this.isValid.set(false);
        this.isSearching.set(false);
        this.hasSearched.set(true);
      }
    });
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  downloadCertificate(): void { window.print(); }

  viewResolutionPdf(): void {
    const cert = this.result();
    if (!cert?.evento_id || !cert?.tipo_asistente_id) {
      this.resolucionError.set('No se encontró la información del evento para esta resolución.');
      this.showResolutionModal.set(true);
      return;
    }

    this.resolucionPdfUrl.set(null);
    this.resolucionError.set('');
    this.dnaLoader.show('Cargando resolución', 'Obteniendo el documento PDF...');

    this.apiService.get<any>('/resolucion-pdf-base64', {
      evento_id: cert.evento_id,
      tipo_asistente: cert.tipo_asistente_id,
    }).subscribe({
      next: (resp) => {
        this.dnaLoader.hide();
        if (resp?.status === 'success' && resp.pdf_base64) {
          this.resolucionPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(resp.pdf_base64));
        } else {
          this.resolucionError.set('No se encontró una resolución en PDF para este certificado.');
        }
        this.showResolutionModal.set(true);
      },
      error: (err) => {
        this.dnaLoader.hide();
        this.resolucionError.set(err?.error?.message || 'No se encontró una resolución en PDF para este certificado.');
        this.showResolutionModal.set(true);
      }
    });
  }

  closeResolutionPdf(): void {
    this.showResolutionModal.set(false);
    this.resolucionPdfUrl.set(null);
    this.resolucionError.set('');
  }

  getQrCodeSvgRaw(code: string): string {
    const url = `https://iestpchojata.edu.pe/certificados/validador?code=${encodeURIComponent(code)}`;
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      return qr.createSvgTag(4, 0)
        .replace('<svg', '<svg class="w-full h-full text-slate-800"')
        .replace(/fill="black"/g, 'fill="currentColor"');
    } catch { return ''; }
  }

  getQrCodeSvg(code: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getQrCodeSvgRaw(code));
  }
}
