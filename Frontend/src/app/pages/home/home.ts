import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HeroImage } from '../../components/hero-image/hero-image';
import { PlatformService, EventItem, Certificate } from '../../services/platform.service';
import { SearchCertificates } from '../search-certificates/search-certificates';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, HeroImage],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly route = inject(ActivatedRoute);
  private readonly searchCertificatesHelper = new SearchCertificates();

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.selectedCategory.set(params['category'] || 'Todos');
    });
  }

  // Filters state
  selectedCategory = signal<string>('Todos');
  selectedStatus = signal<'activo' | 'pasado'>('activo');
  selectedYear = signal<string>('Todos');

  // Detailed Modal Event
  selectedEventForModal = signal<EventItem | null>(null);

  // Quick Validation sidebar input
  quickCertCode = '';
  quickValidationResult = signal<{ success: boolean; message: string; cert?: Certificate } | null>(null);

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

  // --- REFINEMENT: 3-STEP REGISTRATION MODAL STATES ---
  activeStep = signal<number>(0); // 0: closed, 1: DNI modal, 2: Form modal, 3: Success modal
  currentRegisterEvent = signal<EventItem | null>(null);

  // Paso 1 State
  dniInput = '';
  dniError = signal<string>('');

  // Paso 2 Form State
  assistantType = 'Estudiante';
  provenance = 'Interno';
  lastName = '';
  firstName = '';
  degree = '';
  emailInput = '';
  phoneInput = '';

  // Captcha Lógica
  captchaText = signal<string>('');
  captchaUserInput = '';
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
        const itemYear = e.date.split('-')[0];
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
    this.dniInput = '';
    this.dniError.set('');
    this.activeStep.set(1); // Open Paso 1 Modal
  }

  closeRegistrationFlow(): void {
    this.activeStep.set(0);
    this.currentRegisterEvent.set(null);
  }

  // Paso 1: Buscar DNI
  onDniSearch(): void {
    const dni = this.dniInput.trim();
    if (!dni || dni.length !== 8 || isNaN(Number(dni))) {
      this.dniError.set('Ingrese un DNI válido de 8 dígitos numéricos.');
      return;
    }

    this.dniError.set('');
    
    // Check if user pre-exists in mock database to auto-fill for high UX
    const existingUser = this.platformService.users().find(u => u.dni === dni);
    
    if (existingUser) {
      const names = existingUser.name.split(' ');
      this.firstName = names[0] || '';
      this.lastName = names.slice(1).join(' ') || '';
      this.emailInput = existingUser.email;
      this.phoneInput = '9' + Math.floor(10000000 + Math.random() * 90000000); // mock phone
      this.degree = existingUser.role === 'Administrador' ? 'Doctorado' : 'Bachiller';
      this.assistantType = existingUser.role === 'Administrador' ? 'Docente' : 'Público General';
      this.provenance = 'Interno';
    } else {
      // Clear form for fresh entry
      this.firstName = '';
      this.lastName = '';
      this.emailInput = '';
      this.phoneInput = '';
      this.degree = '';
      this.assistantType = 'Estudiante';
      this.provenance = 'Externo';
    }

    // Generate CAPTCHA and move to Paso 2
    this.generateCaptcha();
    this.captchaUserInput = '';
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
    if (!this.firstName.trim() || !this.lastName.trim() || !this.emailInput.trim() || !this.phoneInput.trim()) {
      this.captchaError.set('Por favor, complete todos los campos obligatorios.');
      return;
    }

    // Verify Captcha
    if (this.captchaUserInput.trim().toUpperCase() !== this.captchaText()) {
      this.captchaError.set('Código CAPTCHA incorrecto. Intente de nuevo.');
      this.generateCaptcha();
      this.captchaUserInput = '';
      return;
    }

    this.captchaError.set('');
    const event = this.currentRegisterEvent();
    if (!event) return;

    // Trigger stateful registration in service
    const fullName = `${this.firstName.trim()} ${this.lastName.trim()}`;
    const res = this.platformService.registerToEvent(
      this.dniInput,
      fullName,
      this.emailInput.trim(),
      event.id
    );

    if (res.success) {
      // Setup Paso 3 variables
      const registrationCount = this.platformService.registrations().length;
      this.registrationCode.set(`INS-2026-${String(registrationCount).padStart(3, '0')}`);
      this.successFullName.set(fullName);
      this.activeStep.set(3); // Advance to Paso 3 Success Modal
    } else {
      this.captchaError.set(res.message);
    }
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
      Documento (DNI)       : ${this.dniInput}
      Tipo de Asistente     : ${this.assistantType}
      Procedencia           : ${this.provenance}
      
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

    // Download as a .txt file dynamically for high accessibility
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
    const code = this.quickCertCode.trim();
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
    this.quickCertCode = '';
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

  getQrCodeSvg(code: string): string {
    return this.searchCertificatesHelper.getQrCodeSvg(code);
  }
}
