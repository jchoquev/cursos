import { Component, signal, computed, inject, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroImage } from '../../components/hero-image/hero-image';
import { PlatformService, EventItem, Certificate } from '../../services/platform.service';
import { ApiService } from '../../services/api.service';
import { SearchCertificates } from '../search-certificates/search-certificates';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroImage],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly searchCertificatesHelper = new SearchCertificates();

  ngOnInit(): void {
    // takeUntilDestroyed evita memory leaks al destruir el componente
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectedCategory.set(params['category'] || 'Todos');
    });
    this.platformService.loadEvents();
  }

  // Filters state
  selectedCategory = signal<string>('Todos');
  selectedStatus = signal<'activo' | 'pasado'>('activo');
  selectedYear = signal<string>('Todos');

  readonly categories = computed(() => {
    const types = this.platformService.activityTypes().map(t => t.tipActividad);
    return ['Todos', ...types, 'Repositorio'];
  });

  // Detailed Modal Event
  selectedEventForModal = signal<EventItem | null>(null);

  // Quick Validation sidebar input — ahora como signal
  quickCertCode = signal<string>('');
  quickValidationResult = signal<{ success: boolean; message: string; cert?: Certificate } | null>(null);

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

  // --- REFINEMENT: 3-STEP REGISTRATION MODAL STATES ---
  activeStep = signal<number>(0); // 0: closed, 1: DNI modal, 2: Form modal, 3: Success modal
  currentRegisterEvent = signal<EventItem | null>(null);

  // Paso 1 State — signal
  dniInput = signal<string>('');
  dniError = signal<string>('');
  isDniFound = signal<boolean>(false);

  // Paso 2 Form State — signals para todos los campos del formulario
  assistantType = signal<number>(1);
  provenance = signal<string>('Interno');
  paternalLastName = signal<string>('');
  maternalLastName = signal<string>('');
  firstName = signal<string>('');
  degree = signal<string>('');
  emailInput = signal<string>('');
  phoneInput = signal<string>('');

  // Captcha Lógica — signals
  captchaText = signal<string>('');
  captchaUserInput = signal<string>('');
  captchaError = signal<string>('');

  // Paso 3 Success State
  registrationCode = signal<string>('');
  successFullName = signal<string>('');

  // Filtered Events Computed Signal
  readonly filteredEvents = computed(() => {
    const list = this.platformService.events();
    const cat = this.selectedCategory();
    const stat = this.selectedStatus();
    const yr = this.selectedYear();

    return list.filter((e) => {
      if (cat === 'Repositorio') {
        const dateParts = e.date.includes('/') ? e.date.split('/') : [];
        const itemYear = dateParts.length === 3 ? dateParts[2] : e.date.split('-')[0];
        const matchYear = yr === 'Todos' || itemYear === yr;
        return e.type === 'Repositorio' && matchYear;
      } else {
        const matchStatus = e.status === stat;
        const matchCategory = cat === 'Todos' ? e.type !== 'Repositorio' : e.type === cat;
        return matchStatus && matchCategory;
      }
    });
  });

  // --- ACTIONS ---

  selectCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  selectStatus(stat: 'activo' | 'pasado'): void {
    this.selectedStatus.set(stat);
  }

  selectYear(yr: string): void {
    this.selectedYear.set(yr);
  }

  openEventDetails(event: EventItem): void {
    this.selectedEventForModal.set(event);
  }

  closeEventDetailsModal(): void {
    this.selectedEventForModal.set(null);
  }

  // --- 3-STEP REGISTRATION SYSTEM ---

  startRegistrationFlow(event: EventItem): void {
    this.currentRegisterEvent.set(event);
    this.dniInput.set('');
    this.dniError.set('');
    this.isDniFound.set(false);
    this.activeStep.set(1);
  }

  closeRegistrationFlow(): void {
    this.activeStep.set(0);
    this.currentRegisterEvent.set(null);
  }

  isSearchingDni = signal<boolean>(false);

  // Paso 1: Buscar DNI
  onDniSearch(): void {
    const dni = this.dniInput().trim();
    if (!dni || dni.length !== 8 || isNaN(Number(dni))) {
      this.dniError.set('Ingrese un DNI válido de 8 dígitos numéricos.');
      return;
    }

    this.dniError.set('');
    this.isSearchingDni.set(true);

    this.apiService.get<any>('/consulta-dni/' + dni).subscribe({
      next: (resp) => {
        this.isSearchingDni.set(false);
        const data = resp.data;
        if (data) {
          this.isDniFound.set(true);
          this.firstName.set(data.Nombres || '');
          this.paternalLastName.set(data.ApPaterno || '');
          this.maternalLastName.set(data.ApMaterno || '');
          this.emailInput.set(data.Correo || '');
          this.phoneInput.set(data.NumCelular || '');
          this.degree.set(data.Grado || '');
          // Map to database TipoAsistente IDs: 1 = ASISTENTE, 2 = PONENTE, 3 = ORGANIZADOR
          let tipoId = 1;
          if (data.TipoAsistente === 'Docente') {
            tipoId = 2; // PONENTE
          }
          this.assistantType.set(tipoId);
          this.provenance.set(data.Procedencia || 'Interno');
        } else {
          this.setExternoForm();
        }
        this.goToStep2();
      },
      error: (err) => {
        this.isSearchingDni.set(false);
        // DNI not found, so it is Externo
        this.setExternoForm();
        this.goToStep2();
      }
    });
  }

  private setExternoForm(): void {
    this.isDniFound.set(false);
    this.firstName.set('');
    this.paternalLastName.set('');
    this.maternalLastName.set('');
    this.emailInput.set('');
    this.phoneInput.set('');
    this.degree.set('');
    this.assistantType.set(1);
    this.provenance.set('Externo');
  }

  private goToStep2(): void {
    this.generateCaptcha();
    this.captchaUserInput.set('');
    this.captchaError.set('');
    this.activeStep.set(2);
  }

  // CAPTCHA Generator
  generateCaptcha(): void {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // skipped ambiguous chars like O, 0, I, 1
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.captchaText.set(result);
  }

  // Paso 2: Registrar
  onRegisterSubmit(): void {
    if (!this.firstName().trim() || !this.paternalLastName().trim() || !this.maternalLastName().trim() || !this.emailInput().trim() || !this.phoneInput().trim()) {
      this.captchaError.set('Por favor, complete todos los campos obligatorios.');
      return;
    }

    if (this.captchaUserInput().trim().toUpperCase() !== this.captchaText()) {
      this.captchaError.set('Código CAPTCHA incorrecto. Intente de nuevo.');
      this.generateCaptcha();
      this.captchaUserInput.set('');
      return;
    }

    this.captchaError.set('');
    const event = this.currentRegisterEvent();
    if (!event) return;

    const fullName = `${this.firstName().trim()} ${this.paternalLastName().trim()} ${this.maternalLastName().trim()}`;
    
    const payload = {
      DNI: this.dniInput(),
      Procedencia: this.provenance(),
      Nombres: this.firstName().trim(),
      ApPaterno: this.paternalLastName().trim(),
      ApMaterno: this.maternalLastName().trim(),
      GradAcademico: this.degree().trim() || null,
      Correo: this.emailInput().trim(),
      NumCelular: this.phoneInput().trim(),
      TipoAsistente: this.assistantType(),
      evento_id: event.id
    };

    this.apiService.post<any>('/matriculas', payload).subscribe({
      next: (resp) => {
        if (resp.status === 'success' && resp.data) {
          // Update the local mock store as well so it propagates to intranet stats immediately
          const newReg = {
            id: resp.data.id,
            userEmail: payload.Correo,
            userName: fullName,
            userDni: payload.DNI,
            eventId: payload.evento_id,
            eventTitle: event.title,
            date: new Date().toISOString().split('T')[0],
            status: 'Pendiente' as const,
            tipoAsistente: this.platformService.tipoAsistentes().find(t => t.id === payload.TipoAsistente)?.AsigTipo || 'ASISTENTE'
          };
          this.platformService.registrations.update(curr => [...curr, newReg]);

          this.registrationCode.set(`INS-2026-${String(resp.data.id).padStart(3, '0')}`);
          this.successFullName.set(fullName);
          this.activeStep.set(3);
        } else {
          this.captchaError.set(resp.message || 'Error al procesar la inscripción.');
        }
      },
      error: (err) => {
        console.error('Error al registrar matricula:', err);
        const errMsg = err?.error?.message || 'Error al conectar con el servidor para registrar la inscripción.';
        this.captchaError.set(errMsg);
      }
    });
  }

  // Paso 3: Descargar Constancia de Matrícula (Print / PDF)
  downloadConstancia(): void {
    const printContent = `
      ======================================================
      CONSTANCIA OFICIAL DE INSCRIPCIÓN INSTITUCIONAL
      ======================================================
      
      Código de Inscripción : ${this.registrationCode()}
      Fecha de Solicitud    : ${new Date().toISOString().split('T')[0]}
      
      DATOS DEL PARTICIPANTE:
      ------------------------------------------------------
      Nombre Completo       : ${this.successFullName()}
      Documento (DNI)       : ${this.dniInput()}
      Tipo de Asistente     : ${this.platformService.tipoAsistentes().find(t => t.id === this.assistantType())?.AsigTipo || 'ASISTENTE'}
      Procedencia           : ${this.provenance()}
      
      DATOS DEL EVENTO ACADÉMICO:
      ------------------------------------------------------
      Evento / Curso        : ${this.currentRegisterEvent()?.title}
      Categoría             : ${this.currentRegisterEvent()?.type}
      Fecha de Inicio       : ${this.currentRegisterEvent()?.date}
      Duración Académica    : ${this.currentRegisterEvent()?.hours} horas lectivas
      Docente Expositor     : ${this.currentRegisterEvent()?.instructor}
      
      ------------------------------------------------------
      Estado de Solicitud   : PENDIENTE DE APROBACIÓN
      ------------------------------------------------------
      
      * Nota: Esta constancia acredita la solicitud formal de
      matrícula. Una vez aprobado por secretaría académica, el
      participante podrá ingresar a la intranet con su correo
      institucional para el registro de asistencias.
      
      IESTP Chojata
      Secretaría de Extensión Académica
      ======================================================
    `;

    const blob = new Blob([printContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Constancia_${this.registrationCode()}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Quick certificate validation by code in sidebar
  handleQuickValidation(): void {
    const code = this.quickCertCode().trim();
    if (!code) return;

    const cert = this.platformService.findCertificateByCode(code);
    if (cert) {
      this.showPrintCertModal.set(false);
      this.showResolutionModal.set(false);
      this.quickValidationResult.set({
        success: true,
        message: 'Certificado Válido y Oficial.',
        cert,
      });
    } else {
      this.quickValidationResult.set({
        success: false,
        message: 'El código ingresado no coincide con ningún registro oficial.',
      });
    }
    this.quickCertCode.set('');
  }

  closeQuickValidation(): void {
    this.quickValidationResult.set(null);
  }

  downloadCertificate(): void {
    window.print();
  }

  // Resolution modal controls
  viewResolutionPdf(cert: Certificate): void {
    this.showResolutionModal.set(true);
  }

  closeResolutionPdf(): void {
    this.showResolutionModal.set(false);
  }

  getQrCodeSvg(code: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.searchCertificatesHelper.getQrCodeSvgRaw(code)
    );
  }
}
