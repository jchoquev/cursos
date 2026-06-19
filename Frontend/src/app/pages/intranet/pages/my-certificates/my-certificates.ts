import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService, Certificate } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { IntranetCertViewerService } from '../../../../services/intranet-cert-viewer.service';
import { SearchCertificates } from '../../../search-certificates/search-certificates';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-my-certificates',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-certificates.html',
})
export class MyCertificatesComponent implements OnInit {
  readonly platformService = inject(PlatformService);

  ngOnInit(): void {
    this.platformService.loadRegistrations();
  }
  private readonly apiService = inject(ApiService);
  private readonly certViewer = inject(IntranetCertViewerService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly searchCertHelper = new SearchCertificates();

  readonly myCertificates = computed(() => {
    const user = this.platformService.currentUser();
    if (!user) return [];
    return this.platformService.certificates().filter(c => c.dni === user.dni);
  });

  getQrCodeSvg(code: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.searchCertHelper.getQrCodeSvgRaw(code));
  }

  viewCertificate(cert: Certificate): void {
    this.certViewer.showPrintCertModal.set(false);
    this.certViewer.showResolutionModal.set(false);
    const reg = this.platformService.registrations().find(r => r.userDni === cert.dni && r.eventId === cert.eventId);
    const tipoAsistenteId = reg ? reg.tipoAsistenteId : 1;
    this.apiService.get<any>('/e-documentos/fondo-base64', { evento_id: cert.eventId, tipo_asistente: tipoAsistenteId }).subscribe({
      next: (resp) => {
        this.certViewer.certFondoBase64.set(resp?.status === 'success' ? resp.fondo_base64 : null);
        this.certViewer.certDocData.set(resp?.status === 'success' ? resp.e_documento : null);
        this.certViewer.certParticipantData.set({ code: cert.code, fullName: cert.fullName, dni: cert.dni, eventId: cert.eventId, eventTitle: cert.eventTitle, issueDate: cert.issueDate, tipoAsistente: reg?.tipoAsistente || 'ASISTENTE', hours: cert.hours || 150 });
        this.certViewer.showCertWithBackground.set(true);
      },
      error: () => {
        this.certViewer.certFondoBase64.set(null);
        this.certViewer.certDocData.set(null);
        this.certViewer.certParticipantData.set({ code: cert.code, fullName: cert.fullName, dni: cert.dni, eventId: cert.eventId, eventTitle: cert.eventTitle, issueDate: cert.issueDate, tipoAsistente: reg?.tipoAsistente || 'ASISTENTE', hours: cert.hours || 150 });
        this.certViewer.showCertWithBackground.set(true);
      }
    });
  }

  viewAndDownload(cert: Certificate): void {
    this.viewCertificate(cert);
    setTimeout(() => window.print(), 1200);
  }
}
