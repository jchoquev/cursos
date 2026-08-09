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
import html2canvas from 'html2canvas-pro';

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

  /** PNG dinámico generado desde un canvas. Es lo que se muestra en el modal
   * y también lo único que se envía a impresión. */
  readonly certificatePreviewImage = signal<string | null>(null);
  private certificatePrintImageElement: HTMLImageElement | null = null;
  private certificatePreviewGeneration = 0;

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

    effect(() => {
      const open = this.showCertWithBackground();
      const participant = this.certParticipantData();
      // Estas lecturas vuelven a generar la imagen si cambia la plantilla.
      this.certFondoBase64();
      this.certDocData();
      const generation = ++this.certificatePreviewGeneration;

      if (!open || !participant) {
        this.certificatePreviewImage.set(null);
        this.clearCertificatePrintImage();
        return;
      }

      setTimeout(() => { void this.generateCertificatePreview(generation); });
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
      'tipo-asistentes': 'Administración — Tipos de Asistente',
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
      'tipo-asistentes': '🎫 Administración — Tipos de Asistente',
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
    this.certificatePreviewImage.set(null);
    this.clearCertificatePrintImage();
  }

  private clearCertificatePrintImage(): void {
    this.certificatePrintImageElement?.remove();
    this.certificatePrintImageElement = null;
  }

  private async mountCertificatePrintImage(source: string): Promise<void> {
    const modal = document.querySelector<HTMLElement>('.certificate-print-modal');
    if (!modal) throw new Error('No se encontró el contenedor de impresión del certificado.');

    this.clearCertificatePrintImage();
    const image = document.createElement('img');
    image.className = 'certificate-raster-print';
    image.alt = 'Certificado rasterizado para impresión A4';
    image.src = source;
    modal.insertBefore(image, modal.firstChild);
    this.certificatePrintImageElement = image;
    await image.decode();
  }

  private async generateCertificatePreview(generation: number): Promise<string | null> {
    if (!this.isBrowser || generation !== this.certificatePreviewGeneration) return null;

    // Vuelve a mostrar la plantilla durante la captura; después queda
    // sustituida por el PNG dinámico en la vista previa.
    this.certificatePreviewImage.set(null);
    // Esperar la fuente manuscrita antes de rasterizar. Si el navegador
    // rechaza la carga por caché o por una ruta de assets antigua, no se debe
    // cancelar toda la impresión: html2canvas usará la fuente declarada en CSS.
    if (document.fonts) {
      try {
        // Registrar la fuente con FontFace evita que html2canvas use la
        // fuente genérica "cursive" dentro del documento clonado.
        const handwrittenFont = new FontFace(
          'Chocolate',
          'url("/font/chocolate_5/Chocolate.ttf") format("truetype")'
        );
        await handwrittenFont.load();
        document.fonts.add(handwrittenFont);
        await document.fonts.load('38.5px "Chocolate"');
        await document.fonts.ready;
      } catch (fontError) {
        console.warn('No se pudo precargar Chocolate; se continúa con CSS.', fontError);
      }
    }
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    if (generation !== this.certificatePreviewGeneration) return null;
    const image = await this.createCertificateCanvasImage();

    if (generation === this.certificatePreviewGeneration) {
      this.certificatePreviewImage.set(image);
      return image;
    }
    return null;
  }

  private async createCertificateCanvasImage(): Promise<string> {
    const certificate = document.getElementById('landscape-certificate-print-area');
    if (!certificate) throw new Error('No se encontró la plantilla del certificado.');

    const canvas = await html2canvas(certificate, {
      backgroundColor: '#ffffff',
      // 960 × 678 a escala 4 genera 3840 × 2712 px: ~328 DPI al ocupar
      // una hoja A4 horizontal (297 × 210 mm), apto para PDF e impresión.
      scale: 4,
      useCORS: true,
      logging: false,
      onclone: (clonedDocument) => {
        const clonedCertificate = clonedDocument.getElementById('landscape-certificate-print-area');
        if (!clonedCertificate) return;
        clonedCertificate.style.transform = 'none';
        clonedCertificate.style.borderRadius = '0';
        clonedCertificate.style.boxShadow = 'none';
      },
    });
    return canvas.toDataURL('image/png');
  }

  async downloadCertificate(): Promise<void> {
    if (!this.isBrowser) return;

    try {
      let image = this.certificatePreviewImage();
      if (!image) {
        const generation = ++this.certificatePreviewGeneration;
        image = await this.generateCertificatePreview(generation);
      }
      if (!image) throw new Error('No se pudo obtener la imagen dinámica del certificado.');

      await this.mountCertificatePrintImage(image);
      // La imagen ya está en el DOM; este frame garantiza que
      // Chrome evalúe las reglas @media print que ocultan el HTML original.
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      window.addEventListener('afterprint', () => this.clearCertificatePrintImage(), { once: true });
      window.print();
    } catch (error) {
      console.error('No se pudo generar el canvas del certificado para impresión.', error);
      this.clearCertificatePrintImage();
      this.alert.error(
        'No se pudo generar la impresión',
        'El certificado no se imprimió como HTML. Vuelve a intentarlo para generar el canvas A4.'
      );
    }
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
        setTimeout(() => { void this.downloadCertificate(); }, 1000);
      },
      error: () => {
        this.certViewer.certFondoBase64.set(null);
        this.certViewer.certDocData.set(null);
        this.certViewer.certParticipantData.set(participantData);
        this.certViewer.showCertWithBackground.set(true);
        setTimeout(() => { void this.downloadCertificate(); }, 1000);
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
