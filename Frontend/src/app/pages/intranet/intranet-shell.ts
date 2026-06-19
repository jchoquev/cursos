import { Component, signal, computed, inject, OnInit, PLATFORM_ID, afterNextRender, ViewEncapsulation, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { PlatformService, Certificate, Registration } from '../../services/platform.service';
import { ApiService } from '../../services/api.service';
import qrcode from 'qrcode-generator';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ThemeService } from '../../services/theme.service';
import { IntranetCertViewerService } from '../../services/intranet-cert-viewer.service';
import { IntranetPaymentService } from '../../services/intranet-payment.service';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-intranet-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RouterLink, RouterLinkActive, NgxEditorModule],
  templateUrl: './intranet-shell.html',
  styleUrl: './intranet.css',
  encapsulation: ViewEncapsulation.None,
})
export class IntranetShellComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly platformId = inject(PLATFORM_ID);
  readonly themeService = inject(ThemeService);
  readonly themeMode = this.themeService.mode;
  readonly certViewer = inject(IntranetCertViewerService);
  readonly paymentService = inject(IntranetPaymentService);
  private readonly alert = inject(AlertService);

  toggleTheme(): void { this.themeService.toggle(); }

  // Auth

  // Sidebar
  sidebarCollapsed = signal<boolean>(false);
  toggleSidebar(): void { this.sidebarCollapsed.update(c => !c); }

  periodoActivo = signal<string>('');

  // Current route segment for breadcrumb
  currentRouteSegment = signal<string>('overview');

  // Global modals
  showPaymentModal = signal<boolean>(false);
  activeCertificate = signal<Certificate | null>(null);
  showCertificateModal = signal<boolean>(false);

  // Cert viewer — delegated to IntranetCertViewerService so child routes can trigger it
  get showResolutionModal() { return this.certViewer.showResolutionModal; }
  get showPrintCertModal() { return this.certViewer.showPrintCertModal; }
  get certFondoBase64() { return this.certViewer.certFondoBase64; }
  get certDocData() { return this.certViewer.certDocData; }
  get showCertWithBackground() { return this.certViewer.showCertWithBackground; }
  get certParticipantData() { return this.certViewer.certParticipantData; }

  isBrowser = false;
  editor!: Editor;
  editorTexto01!: Editor;
  editorTexto02!: Editor;

  toolbar: Toolbar = [
    ['bold', 'italic', 'underline'],
    ['code'],
    ['link'],
    ['text_color', 'background_color'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ];

  // Stats for sidebar badge
  readonly stats = computed(() => {
    const regs = this.platformService.registrations();
    const pendingRegs = regs.filter(r => !r.isPaymentValidated).length;
    return { pendingRegistrations: pendingRegs };
  });

  getQrCodeSvg(code: string): SafeHtml {
    const url = `https://iestpchojata.edu.pe/certificados/validador?code=${encodeURIComponent(code)}`;
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      const svg = qr.createSvgTag(4, 0)
        .replace('<svg', '<svg class="w-full h-full text-slate-800"')
        .replace(/fill="black"/g, 'fill="currentColor"');
      return this.sanitizer.bypassSecurityTrustHtml(svg);
    } catch { return this.sanitizer.bypassSecurityTrustHtml(''); }
  }

  constructor() {
    effect(() => {
      const reg = this.paymentService.selectedRegistration();
      if (this.paymentService.showPaymentModal() && reg) {
        this.selectedRegistrationId.set(reg.id);
        this.paymentReceiptNumber.set('');
        this.paymentDate.set('');
        this.paymentAmount.set(null);
        this.paymentImage.set('');
        this.paymentIsFree.set(false);
        this.showPaymentModal.set(true);
      } else if (!this.paymentService.showPaymentModal()) {
        this.showPaymentModal.set(false);
      }
    });

    afterNextRender(() => {
      this.isBrowser = true;
      this.editor = new Editor();
      this.editorTexto01 = new Editor();
      this.editorTexto02 = new Editor();
    });

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url: string = e.urlAfterRedirects || e.url || '';
      const parts = url.split('/').filter(Boolean);
      this.currentRouteSegment.set(parts[parts.length - 1] || 'overview');
    });
  }

  ngOnInit(): void {
    this.apiService.get<any>('/periodo-aca/activo').subscribe({
      next: (data) => { if (data?.Asig) this.periodoActivo.set(data.Asig); }
    });}

  readonly breadcrumbLabel = computed(() => {
    const seg = this.currentRouteSegment();
    const map: Record<string, string> = {
      'overview': 'Resumen General',
      'users': 'Gestión Usuarios',
      'courses': 'Gestión de Eventos',
      'registrations': 'Inscripciones',
      'certificates': 'Emisión de Certificados',
      'attendance': 'Control de Asistencia',
      'my-courses': 'Mis Cursos',
      'my-registrations': 'Mis Inscripciones',
      'my-certificates': 'Mis Diplomas',
      'projects': 'Gestión de Proyectos',
      'register-events': 'Registro de Eventos',
      'internal-data': 'Información Interna',
    };
    return map[seg] || seg;
  });

  readonly pageTitle = computed(() => {
    const seg = this.currentRouteSegment();
    const map: Record<string, string> = {
      'overview': '📊 Resumen Operativo de la Plataforma',
      'users': '👥 Administración — Gestión de Usuarios',
      'courses': '📅 Formación Continua — Gestión de Eventos',
      'registrations': '📥 Validación General de Inscripciones',
      'certificates': '🎓 Formación Continua — Emisión de Certificados',
      'attendance': '📋 Control de Asistencia',
      'my-courses': '📚 Mis Cursos Asignados',
      'my-registrations': '📂 Estado de mis Inscripciones',
      'my-certificates': '🎓 Mis Certificaciones y Diplomas',
      'projects': '🔬 Investigación — Gestión de Proyectos',
      'register-events': '📅 Cursos y Eventos Disponibles',
      'internal-data': '📥 Gestión de Información Interna',
      'periodo-aca': '🗓️ Administración — Periodo Académico',
      'inv-lineas': '🧭 Investigación — Líneas de Investigación',
    };
    return map[seg] || seg;
  });

  // ---- AUTH ----
  handleLogout(): void {
    this.platformService.logout();
    this.router.navigate(['/intranet/login']);
  }

  // ---- PAYMENT MODAL ----
  selectedRegistrationId = signal<number>(0);
  paymentReceiptNumber = signal<string>('');
  paymentDate = signal<string>('');
  paymentAmount = signal<number | null>(null);
  paymentImage = signal<string>('');
  paymentIsFree = signal<boolean>(false);

  openPaymentModal(reg: Registration): void {
    this.selectedRegistrationId.set(reg.id);
    this.paymentReceiptNumber.set('');
    this.paymentDate.set('');
    this.paymentAmount.set(null);
    this.paymentImage.set('');
    this.paymentIsFree.set(false);
    this.showPaymentModal.set(true);
    this.paymentService.showPaymentModal.set(true);
  }

  closePaymentModal(): void {
    this.showPaymentModal.set(false);
    this.paymentService.close();
  }

  onReceiptFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { this.paymentImage.set(reader.result as string); };
      reader.readAsDataURL(file);
    }
  }

  submitPaymentValidation(): void {
    const isFree = this.paymentIsFree();
    if (!isFree && (!this.paymentReceiptNumber() || !this.paymentDate() || !this.paymentAmount())) {
      this.alert.warning('Por favor complete todos los datos del recibo o marque como Inscripción Gratuita.');
      return;
    }
    const payload = isFree
      ? { EsGratuito: true }
      : { EsGratuito: false, NumRecibo: this.paymentReceiptNumber(), FechaPago: this.paymentDate(), MontoPago: this.paymentAmount() };

    this.apiService.patch<any>(`/matriculas/${this.selectedRegistrationId()}/validar-pago`, payload).subscribe({
      next: () => {
        this.showPaymentModal.set(false);
        this.alert.success('Pago validado correctamente e inscripción aprobada.');
        this.platformService.loadRegistrations(true);
      },
      error: (err) => {
        this.alert.error('Error al validar el pago', err?.error?.message || 'Error del servidor.');
      }
    });
  }

  // ---- CERTIFICATE MODAL ----
  openCertificateModal(cert: Certificate): void {
    this.activeCertificate.set(cert);
    this.showCertificateModal.set(true);
  }

  closeCertificateModal(): void {
    this.activeCertificate.set(null);
    this.showCertificateModal.set(false);
    this.certViewer.showCertWithBackground.set(false);
  }

  downloadCertificate(): void {
    window.print();
  }

  viewAndDownload(cert: Certificate): void {
    const reg = this.platformService.registrations().find(
      r => r.userDni === cert.dni && r.eventId === cert.eventId
    );
    const tipoAsistenteId = reg ? reg.tipoAsistenteId : 1;
    const participantData = {
      code: cert.code, fullName: cert.fullName, dni: cert.dni,
      eventId: cert.eventId, eventTitle: cert.eventTitle, issueDate: cert.issueDate,
      tipoAsistente: reg?.tipoAsistente || 'ASISTENTE', hours: cert.hours || 150
    };
    this.apiService.get<any>('/e-documentos/fondo-base64', {
      evento_id: cert.eventId,
      tipo_asistente: tipoAsistenteId
    }).subscribe({
      next: (resp) => {
        this.certViewer.certFondoBase64.set(resp?.status === 'success' ? resp.fondo_base64 : null);
        this.certViewer.certDocData.set(resp?.status === 'success' ? resp.e_documento : null);
        this.certViewer.certParticipantData.set(participantData);
        this.certViewer.showCertWithBackground.set(true);
        setTimeout(() => { this.downloadCertificate(); }, 1000);
      },
      error: () => {
        this.certViewer.certFondoBase64.set(null);
        this.certViewer.certDocData.set(null);
        this.certViewer.certParticipantData.set(participantData);
        this.certViewer.showCertWithBackground.set(true);
        setTimeout(() => { this.downloadCertificate(); }, 1000);
      }
    });
  }

  getCertificateObject(r: Registration): Certificate {
    return {
      code: r.documentCode || '',
      fullName: r.userName,
      dni: r.userDni,
      eventId: r.eventId,
      eventTitle: r.eventTitle,
      issueDate: r.date,
      status: r.documentIssued ? 'Válido' : 'Revocado',
      hours: 30,
      signatureName: 'Director General del IESTP Chojata',
      signatureRole: 'Autoridad del Instituto',
    };
  }

  viewResolutionPdf(cert: Certificate): void {
    this.showResolutionModal.set(true);
  }

  closeResolutionPdf(): void {
    this.showResolutionModal.set(false);
  }

  formatDateForCertificate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    try {
      let dateObj: Date;
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        dateObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      } else {
        dateObj = new Date(dateStr);
      }
      if (isNaN(dateObj.getTime())) return dateStr;
      const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
    } catch { return dateStr; }
  }

  toTitleCase(str: string | null | undefined): string {
    if (!str) return '';
    return str.toLowerCase().split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  getPagesArray(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  getMinRecord(page: number, size: number, total: number): number {
    return Math.min(page * size, total);
  }
}
