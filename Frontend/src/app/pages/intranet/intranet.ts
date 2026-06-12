import { Component, signal, computed, inject, OnInit, OnDestroy, PLATFORM_ID, afterNextRender, effect, untracked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, EventItem, UserItem, Registration, Certificate } from '../../services/platform.service';
import { ApiService } from '../../services/api.service';
import { SearchCertificates } from '../search-certificates/search-certificates';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-intranet',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorModule],
  templateUrl: './intranet.html',
  styleUrl: './intranet.css',
})
export class IntranetComponent implements OnInit, OnDestroy {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly sanitizer = inject(DomSanitizer);

  // Auth Inputs — señales para reactividad completa
  emailInput = signal<string>('');
  passwordInput = signal<string>('');
  loginError = signal<string>('');

  // Active view inside dashboard
  activeTab = signal<string>('overview');

  // Sidebar responsive collapse state
  sidebarCollapsed = signal<boolean>(false);

  toggleSidebar(): void {
    this.sidebarCollapsed.update(c => !c);
  }

  // Modals state
  showUserModal = signal<boolean>(false);
  showEventModal = signal<boolean>(false);
  showAttendanceModal = signal<boolean>(false);
  showRegistrationModal = signal<boolean>(false);

  // Registration save state
  savingRegistration = signal<boolean>(false);
  saveRegistrationError = signal<string>('');
  registrationForm = signal<{
    userDni: string;
    userName: string;
    userPaternalLastName: string;
    userMaternalLastName: string;
    userEmail: string;
    userPhone: string;
    userProcedencia: string;
    userTipoAsistente: number;
    userGrado: string;
    eventId: any;
  }>({
    userDni: '',
    userName: '',
    userPaternalLastName: '',
    userMaternalLastName: '',
    userEmail: '',
    userPhone: '',
    userProcedencia: 'Interno',
    userTipoAsistente: 1,
    userGrado: '',
    eventId: null,
  });

  // Event save state
  savingEvent = signal<boolean>(false);
  saveEventError = signal<string>('');
  bannerFile: File | null = null;  // Archivo de imagen real para subir al servidor

  // User save state
  savingUser = signal<boolean>(false);
  saveUserError = signal<string>('');

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

  // Certificado con Fondo Signals
  certFondoBase64 = signal<string | null>(null);
  certDocData = signal<any | null>(null);
  showCertWithBackground = signal<boolean>(false);
  certParticipantData = signal<any | null>(null);

  // CRUD Forms State
  isEditing = signal<boolean>(false);

  // User form data — como signal para reactividad en plantilla
  userForm = signal<{
    email: string;
    name: string;
    role: UserItem['role'];
    dni: string;
    password: string;
  }>({
    email: '',
    name: '',
    role: 'Caja',
    dni: '',
    password: '',
  });
  originalUserEmail = signal<string>(''); // para rastrear cambios de email

  // Event form data — como signal
  eventForm = signal<{
    id: any;
    title: string;
    type: EventItem['type'];
    date: string;
    description: string;
    fullDescription: string;
    imageGradient: string;
    icon: string;
    status: EventItem['status'];
    hours: number;
    instructor: string;
    capacity: number;
    coverUrl?: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
    courseStartDate?: string;
    courseEndDate?: string;
  }>({
    id: 0,
    title: '',
    type: 'Curso',
    date: '',
    description: '',
    fullDescription: '',
    imageGradient: 'from-wine-700 to-wine-900',
    icon: '📚',
    status: 'activo',
    hours: 20,
    instructor: '',
    capacity: 30,
    coverUrl: '',
    registrationStartDate: '',
    registrationEndDate: '',
    courseStartDate: '',
    courseEndDate: '',
  });

  // Attendance form state
  selectedAttendanceEvent = signal<number>(0);
  selectedAttendanceDate = signal<string>(new Date().toISOString().split('T')[0]);

  // Initial rich text editor content
  editorInitialContent = '';
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



  constructor() {
    // If logged in, set default tab
    this.updateDefaultTab();
    afterNextRender(() => {
      this.isBrowser = true;
      this.editor = new Editor();
      this.editorTexto01 = new Editor();
      this.editorTexto02 = new Editor();
    });

    effect(() => {
      // Trigger effect when pagination/sort signals change (NOT search — search triggers on Enter)
      this.internalCurrentPage();
      this.internalPageSize();
      this.internalSortColumn();
      this.internalSortDirection();
      const activeTab = this.activeTab();

      if (this.platformService.isLoggedIn() && activeTab === 'internal-data') {
        untracked(() => {
          this.loadInternalData();
        });
      }
    });
  }



  ngOnInit(): void {
    // Fetch events from backend database only if logged in
    if (this.platformService.isLoggedIn()) {
      this.platformService.loadEvents();
      this.platformService.loadRegistrations();
      this.loadInternalData();
      if (this.platformService.userRole() === 'Administrador') {
        this.platformService.loadUsers();
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.editor) this.editor.destroy();
      if (this.editorTexto01) this.editorTexto01.destroy();
      if (this.editorTexto02) this.editorTexto02.destroy();
    }
  }

  // SearchCertificates instance for reusing QR code rendering
  private readonly searchCertificatesHelper = new SearchCertificates();

  // Active Certificate for Modal View inside Intranet
  activeCertificate = signal<Certificate | null>(null);

  // --- SIGNALS FOR USERS DATATABLE ---
  userSearchQuery = signal<string>('');
  userSortColumn = signal<string>('name');
  userSortDirection = signal<'asc' | 'desc'>('asc');
  userCurrentPage = signal<number>(1);
  userPageSize = signal<number>(5);

  readonly filteredAndPaginatedUsers = computed(() => {
    const query = this.userSearchQuery().toLowerCase().trim();
    const sortCol = this.userSortColumn();
    const sortDir = this.userSortDirection();
    const page = this.userCurrentPage();
    const size = this.userPageSize();

    let list = [...this.platformService.users()];

    if (query) {
      list = list.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.dni.includes(query) ||
        u.role.toLowerCase().includes(query)
      );
    }

    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || '';
      const valB = b[sortCol] || '';
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const start = (page - 1) * size;
    return {
      items: list.slice(start, start + size),
      totalItems: list.length,
      totalPages: Math.ceil(list.length / size) || 1
    };
  });

  changeUserSort(column: string): void {
    if (this.userSortColumn() === column) {
      this.userSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.userSortColumn.set(column);
      this.userSortDirection.set('asc');
    }
    this.userCurrentPage.set(1);
  }

  // --- SIGNALS FOR EVENTS DATATABLE ---
  eventSearchQuery = signal<string>('');
  eventSortColumn = signal<string>('title');
  eventSortDirection = signal<'asc' | 'desc'>('asc');
  eventCurrentPage = signal<number>(1);
  eventPageSize = signal<number>(5);

  readonly filteredAndPaginatedEvents = computed(() => {
    const query = this.eventSearchQuery().toLowerCase().trim();
    const sortCol = this.eventSortColumn();
    const sortDir = this.eventSortDirection();
    const page = this.eventCurrentPage();
    const size = this.eventPageSize();

    let list = [...this.platformService.events()].filter(e => e.type !== 'Repositorio');

    if (query) {
      list = list.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.instructor.toLowerCase().includes(query) ||
        e.type.toLowerCase().includes(query) ||
        e.date.toLowerCase().includes(query)
      );
    }

    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || '';
      const valB = b[sortCol] || '';
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const start = (page - 1) * size;
    return {
      items: list.slice(start, start + size),
      totalItems: list.length,
      totalPages: Math.ceil(list.length / size) || 1
    };
  });

  changeEventSort(column: string): void {
    if (this.eventSortColumn() === column) {
      this.eventSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.eventSortColumn.set(column);
      this.eventSortDirection.set('asc');
    }
    this.eventCurrentPage.set(1);
  }

  // --- SIGNALS FOR REGISTRATIONS DATATABLE ---
  tempFilterYear = signal<string>('');
  tempFilterEventId = signal<any>('');
  tempRegSearchQuery = signal<string>('');

  appliedFilterYear = signal<string>('');
  appliedFilterEventId = signal<any>('');
  appliedRegSearchQuery = signal<string>('');

  regSortColumn = signal<string>('userName');
  regSortDirection = signal<'asc' | 'desc'>('asc');
  regCurrentPage = signal<number>(1);
  regPageSize = signal<number>(5);

  readonly availableRegistrationYears = computed(() => {
    const list = this.platformService.events();
    const years = list
      .map(e => {
        if (e.courseStartDate && e.courseStartDate.includes('/')) {
          const parts = e.courseStartDate.split('/');
          return parts[2];
        }
        if (e.date && e.date.includes('/')) {
          const parts = e.date.split('/');
          return parts[2];
        }
        if (e.created_at) {
          return e.created_at.substring(0, 4);
        }
        return '';
      })
      .filter((y): y is string => !!y && y.length === 4);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a));
  });

  readonly availableEventsForSelectedYear = computed(() => {
    const list = this.platformService.events().filter(e => e.type !== 'Repositorio');
    const selectedY = this.tempFilterYear();
    if (!selectedY) {
      return list;
    }
    return list.filter(e => {
      let year = '';
      if (e.courseStartDate && e.courseStartDate.includes('/')) {
        year = e.courseStartDate.split('/')[2];
      } else if (e.date && e.date.includes('/')) {
        year = e.date.split('/')[2];
      } else if (e.created_at) {
        year = e.created_at.substring(0, 4);
      }
      return year === selectedY;
    });
  });

  applyRegistrationFilters(): void {
    this.appliedFilterYear.set(this.tempFilterYear());
    this.appliedFilterEventId.set(this.tempFilterEventId());
    this.appliedRegSearchQuery.set(this.tempRegSearchQuery());
    this.regCurrentPage.set(1);
  }

  readonly filteredAndPaginatedRegistrations = computed(() => {
    const query = this.appliedRegSearchQuery().toLowerCase().trim();
    const appliedEvent = this.appliedFilterEventId();
    const appliedYear = this.appliedFilterYear();
    const sortCol = this.regSortColumn();
    const sortDir = this.regSortDirection();
    const page = this.regCurrentPage();
    const size = this.regPageSize();

    let list = [...this.platformService.registrations()].filter(r => !r.isPaymentValidated);

    // 1. Filter by event or year
    if (appliedEvent) {
      list = list.filter(r => String(r.eventId) === String(appliedEvent));
    } else if (appliedYear) {
      const eventsInYear = this.platformService.events().filter(e => {
        let year = '';
        if (e.courseStartDate && e.courseStartDate.includes('/')) {
          year = e.courseStartDate.split('/')[2];
        } else if (e.date && e.date.includes('/')) {
          year = e.date.split('/')[2];
        } else if (e.created_at) {
          year = e.created_at.substring(0, 4);
        }
        return year === appliedYear;
      }).map(e => String(e.id));
      list = list.filter(r => eventsInYear.includes(String(r.eventId)));
    }

    // 2. Filter by search query
    if (query) {
      list = list.filter(r =>
        r.userName.toLowerCase().includes(query) ||
        r.userDni.includes(query) ||
        r.eventTitle.toLowerCase().includes(query) ||
        r.userEmail.toLowerCase().includes(query)
      );
    }

    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || '';
      const valB = b[sortCol] || '';
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const start = (page - 1) * size;
    return {
      items: list.slice(start, start + size),
      totalItems: list.length,
      totalPages: Math.ceil(list.length / size) || 1
    };
  });

  changeRegSort(column: string): void {
    if (this.regSortColumn() === column) {
      this.regSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.regSortColumn.set(column);
      this.regSortDirection.set('asc');
    }
    this.regCurrentPage.set(1);
  }

  // --- SIGNALS FOR CERTIFICATES DATATABLE ---
  tempCertFilterYear = signal<string>('');
  tempCertFilterEventId = signal<any>('');
  tempCertSearchQuery = signal<string>('');

  appliedCertFilterYear = signal<string>('');
  appliedCertFilterEventId = signal<any>('');
  appliedCertSearchQuery = signal<string>('');

  certSortColumn = signal<string>('code');
  certSortDirection = signal<'asc' | 'desc'>('asc');
  certCurrentPage = signal<number>(1);
  certPageSize = signal<number>(5);

  /** Años únicos extraídos de los eventos activos */
  readonly certAvailableYears = computed(() => {
    const list = this.platformService.events().filter(e => e.type !== 'Repositorio');
    const years = list
      .map(e => {
        if (e.courseStartDate && e.courseStartDate.includes('/')) {
          return e.courseStartDate.split('/')[2];
        }
        if (e.date && e.date.includes('/')) {
          return e.date.split('/')[2];
        }
        if (e.created_at) {
          return e.created_at.substring(0, 4);
        }
        return '';
      })
      .filter((y): y is string => !!y && y.length === 4);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a));
  });

  /** Eventos filtrados por el año seleccionado */
  readonly availableCertEventsForSelectedYear = computed(() => {
    const list = this.platformService.events().filter(e => e.type !== 'Repositorio');
    const selectedY = this.tempCertFilterYear();
    if (!selectedY) {
      return list;
    }
    return list.filter(e => {
      let year = '';
      if (e.courseStartDate && e.courseStartDate.includes('/')) {
        year = e.courseStartDate.split('/')[2];
      } else if (e.date && e.date.includes('/')) {
        year = e.date.split('/')[2];
      } else if (e.created_at) {
        year = e.created_at.substring(0, 4);
      }
      return year === selectedY;
    });
  });

  applyCertificateFilters(): void {
    this.appliedCertFilterYear.set(this.tempCertFilterYear());
    this.appliedCertFilterEventId.set(this.tempCertFilterEventId());
    this.appliedCertSearchQuery.set(this.tempCertSearchQuery());
    this.certCurrentPage.set(1);
  }

  readonly filteredAndPaginatedCertificates = computed(() => {
    const query = this.appliedCertSearchQuery().toLowerCase().trim();
    const filterYear = this.appliedCertFilterYear();
    const filterEventId = this.appliedCertFilterEventId();
    const sortCol = this.certSortColumn();
    const sortDir = this.certSortDirection();
    const page = this.certCurrentPage();
    const size = this.certPageSize();

    // Show registrations with validated payment
    let list = [...this.platformService.registrations()].filter(r => r.isPaymentValidated);

    if (filterEventId) {
      list = list.filter(r => String(r.eventId) === String(filterEventId));
    } else if (filterYear) {
      const eventsInYear = this.platformService.events().filter(e => {
        let year = '';
        if (e.courseStartDate && e.courseStartDate.includes('/')) {
          year = e.courseStartDate.split('/')[2];
        } else if (e.date && e.date.includes('/')) {
          year = e.date.split('/')[2];
        } else if (e.created_at) {
          year = e.created_at.substring(0, 4);
        }
        return year === filterYear;
      }).map(e => String(e.id));
      list = list.filter(r => eventsInYear.includes(String(r.eventId)));
    }

    if (query) {
      list = list.filter(r =>
        r.userName.toLowerCase().includes(query) ||
        r.userDni.includes(query) ||
        r.eventTitle.toLowerCase().includes(query) ||
        (r.documentCode && r.documentCode.toLowerCase().includes(query))
      );
    }

    list.sort((a: any, b: any) => {
      // Allow sorting on mapped properties dynamically
      const valA = a[sortCol] || '';
      const valB = b[sortCol] || '';
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });

    const start = (page - 1) * size;
    return {
      items: list.slice(start, start + size),
      totalItems: list.length,
      totalPages: Math.ceil(list.length / size) || 1
    };
  });

  changeCertSort(column: string): void {
    if (this.certSortColumn() === column) {
      this.certSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.certSortColumn.set(column);
      this.certSortDirection.set('asc');
    }
    this.certCurrentPage.set(1);
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

  // --- SIGNALS FOR DATA INTERNA DATATABLE ---
  internalDataList = signal<any[]>([]);
  internalSearchQuery = signal<string>('');
  internalSortColumn = signal<string>('DNI');
  internalSortDirection = signal<'asc' | 'desc'>('asc');
  internalCurrentPage = signal<number>(1);
  internalPageSize = signal<number>(5);
  loadingInternalData = signal<boolean>(false);
  totalInternalItems = signal<number>(0);

  showInternalModal = signal<boolean>(false);
  showImportModal = signal<boolean>(false);
  importingCsv = signal<boolean>(false);
  importError = signal<string>('');
  importResult = signal<string>('');

  internalForm = signal<{
    DNI: string;
    Procedencia: string;
    TipoAsistente: string;
    Nombres: string;
    ApPaterno: string;
    ApMaterno: string;
    Grado: string;
    Correo: string;
    NumCelular: string;
  }>({
    DNI: '',
    Procedencia: 'Interno',
    TipoAsistente: 'Estudiante',
    Nombres: '',
    ApPaterno: '',
    ApMaterno: '',
    Grado: '',
    Correo: '',
    NumCelular: '',
  });

  readonly filteredAndPaginatedInternalData = computed(() => {
    const items = this.internalDataList();
    const totalItems = this.totalInternalItems();
    const size = this.internalPageSize();
    const totalPages = Math.ceil(totalItems / size) || 1;
    return {
      items,
      totalItems,
      totalPages
    };
  });

  changeInternalSort(column: string): void {
    if (this.internalSortColumn() === column) {
      this.internalSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.internalSortColumn.set(column);
      this.internalSortDirection.set('asc');
    }
    this.internalCurrentPage.set(1);
    this.loadInternalData();
  }

  onInternalSearchQueryChange(query: string): void {
    this.internalSearchQuery.set(query);
    if (!query) {
      this.internalCurrentPage.set(1);
      this.loadInternalData();
    }
  }

  getPagesArray(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  getMinRecord(page: number, size: number, total: number): number {
    return Math.min(page * size, total);
  }

  // --- PAYMENT VALIDATION STATE & METHODS ---
  showPaymentModal = signal<boolean>(false);
  selectedRegistrationId = signal<number>(0);
  paymentReceiptNumber = signal<string>('');
  paymentDate = signal<string>('');
  paymentAmount = signal<number | null>(null);
  paymentImage = signal<string>('');
  paymentIsFree = signal<boolean>(false);

  openValidatePayment(reg: Registration): void {
    this.selectedRegistrationId.set(reg.id);
    this.paymentReceiptNumber.set('');
    this.paymentDate.set('');
    this.paymentAmount.set(null);
    this.paymentImage.set('');
    this.paymentIsFree.set(false);
    this.showPaymentModal.set(true);
  }

  onReceiptFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.paymentImage.set(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  submitPaymentValidation(): void {
    const isFree = this.paymentIsFree();

    if (!isFree && (!this.paymentReceiptNumber() || !this.paymentDate() || !this.paymentAmount())) {
      alert('Por favor complete todos los datos del recibo o marque como Inscripción Gratuita.');
      return;
    }

    const payload = isFree
      ? { EsGratuito: true }
      : {
          EsGratuito: false,
          NumRecibo: this.paymentReceiptNumber(),
          FechaPago: this.paymentDate(),
          MontoPago: this.paymentAmount(),
        };

    this.apiService.patch<any>(`/matriculas/${this.selectedRegistrationId()}/validar-pago`, payload).subscribe({
      next: (resp) => {
        this.showPaymentModal.set(false);
        alert('✅ Pago validado correctamente e inscripción aprobada.');
        this.platformService.loadRegistrations(); // reload registrations from database
      },
      error: (err) => {
        console.error('Error al validar el pago:', err);
        alert('❌ Error al validar el pago: ' + (err?.error?.message || 'Error del servidor.'));
      }
    });
  }



  // --- AUTH PROCEDURES ---

  handleLogin(): void {
    this.loginError.set('');
    this.platformService.login(this.emailInput(), this.passwordInput()).subscribe({
      next: (success) => {
        if (success) {
          this.emailInput.set('');
          this.passwordInput.set('');
          this.updateDefaultTab();
          this.platformService.loadEvents();
          this.platformService.loadRegistrations();
          this.loadInternalData();
        } else {
          this.loginError.set(
            this.platformService.errorMessage() || 'Credenciales incorrectas. Intente nuevamente.'
          );
        }
      },
      error: () => {
        this.loginError.set('Error al conectar con el servidor. Intente más tarde.');
      },
    });
  }

  quickLogin(role: 'admin' | 'caja' | 'formacion' | 'investigacion'): void {
    this.loginError.set('');
    let email = '';
    let password = '';
    if (role === 'admin') { email = 'admin@institucion.edu'; password = 'admin123'; }
    else if (role === 'caja') { email = 'caja@institucion.edu'; password = 'caja123'; }
    else if (role === 'formacion') { email = 'formacion@institucion.edu'; password = 'formacion123'; }
    else if (role === 'investigacion') { email = 'investigacion@institucion.edu'; password = 'investigacion123'; }

    this.platformService.login(email, password).subscribe({
      next: (success) => {
        if (success) {
          this.updateDefaultTab();
          this.platformService.loadEvents();
          this.platformService.loadRegistrations();
          this.loadInternalData();
        } else {
          this.loginError.set('Error al realizar el login rápido.');
        }
      },
    });
  }

  handleLogout(): void {
    this.platformService.logout();
    this.activeTab.set('overview');
  }

  updateDefaultTab(): void {
    const role = this.platformService.userRole();
    if (role === 'Administrador') {
      this.activeTab.set('overview');
    } else if (role === 'Caja') {
      this.activeTab.set('registrations');
    } else if (role === 'Formación Continua') {
      this.activeTab.set('events');
    } else if (role === 'Investigación') {
      this.activeTab.set('projects');
    }
  }

  // --- STATS COMPUTATIONS (ADMIN / COORD) ---
  readonly stats = computed(() => {
    const evs = this.platformService.events();
    const regs = this.platformService.registrations();
    const certs = this.platformService.certificates();
    const usrs = this.platformService.users();

    const pendingRegs = regs.filter(r => !r.isPaymentValidated).length;
    const activeEvents = evs.filter(e => e.status === 'activo').length;

    // Attendance rate mock calculation
    const totalAttendances = this.platformService.attendances().length;
    let attendPercent = 88;
    if (totalAttendances > 0) {
      const records = this.platformService.attendances().map(a => Object.values(a.records)).flat();
      const present = records.filter(r => r === true).length;
      attendPercent = records.length > 0 ? Math.round((present / records.length) * 100) : 88;
    }

    return {
      totalEvents: evs.length,
      activeEvents,
      totalUsers: usrs.length,
      totalRegistrations: regs.length,
      pendingRegistrations: pendingRegs,
      totalCertificates: certs.length,
      attendanceRate: attendPercent,
    };
  });

  // --- PROJECTS LIST ---
  readonly projectsList = computed(() => {
    return this.platformService.events().filter(e => e.type === 'Repositorio');
  });

  // --- USER CRUD ---
  openAddUser(): void {
    this.isEditing.set(false);
    this.savingUser.set(false);
    this.saveUserError.set('');
    this.userForm.set({
      email: '',
      name: '',
      role: 'Caja',
      dni: '',
      password: '',
    });
    this.showUserModal.set(true);
  }

  openEditUser(user: UserItem): void {
    this.isEditing.set(true);
    this.savingUser.set(false);
    this.saveUserError.set('');
    this.originalUserEmail.set(user.email);
    this.userForm.set({
      email: user.email,
      name: user.name,
      role: user.role,
      dni: user.dni,
      password: user.password || 'part123',
    });
    this.showUserModal.set(true);
  }

  saveUser(): void {
    const form = this.userForm();
    if (!form.email || !form.name || !form.dni) return;

    this.savingUser.set(true);
    this.saveUserError.set('');

    if (this.isEditing()) {
      const updatedUser: UserItem = {
        email: form.email,
        name: form.name,
        role: form.role,
        dni: form.dni,
        password: form.password,
      };
      this.platformService.editUser(updatedUser, this.originalUserEmail()).subscribe({
        next: () => {
          this.savingUser.set(false);
          this.showUserModal.set(false);
          alert('✅ Datos de usuario actualizados correctamente.');
        },
        error: (err) => {
          this.savingUser.set(false);
          this.saveUserError.set(err?.error?.message || 'Error al actualizar el usuario.');
        }
      });
    } else {
      const autoPassword = this.generateSecurePassword();
      const newUser: UserItem = {
        email: form.email,
        name: form.name,
        role: form.role,
        dni: form.dni,
        password: autoPassword,
      };
      this.platformService.addUser(newUser).subscribe({
        next: () => {
          this.savingUser.set(false);
          this.showUserModal.set(false);
          alert(`✅ Usuario registrado. Se ha enviado un correo a ${newUser.email} con las credenciales de acceso.`);
        },
        error: (err) => {
          this.savingUser.set(false);
          this.saveUserError.set(err?.error?.message || 'Error al registrar el usuario.');
        }
      });
    }
  }

  /** Genera una contraseña aleatoria segura para nuevos usuarios */
  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  deleteUser(email: string): void {
    if (confirm('¿Está seguro de eliminar a este usuario? Se cancelarán también todas sus inscripciones vinculadas.')) {
      this.platformService.deleteUser(email);
    }
  }

  // --- EVENT CRUD ---
  // --- EVENT CRUD ---
  openAddEvent(): void {
    this.isEditing.set(false);
    this.editorInitialContent = '';
    this.saveEventError.set('');
    this.savingEvent.set(false);
    this.eventForm.set({
      id: 0,
      title: '',
      type: 'Curso',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: '',
      fullDescription: '',
      imageGradient: 'from-rose-600 via-pink-600 to-red-700',
      icon: '📚',
      status: 'activo',
      hours: 30,
      instructor: '',
      capacity: 35,
      coverUrl: '',
      registrationStartDate: '',
      registrationEndDate: '',
      courseStartDate: '',
      courseEndDate: '',
    });
    this.showEventModal.set(true);
  }

  openAddProject(): void {
    this.isEditing.set(false);
    this.editorInitialContent = '';
    this.eventForm.set({
      id: 0,
      title: '',
      type: 'Repositorio',
      date: new Date().toISOString().split('T')[0],
      description: '',
      fullDescription: '',
      imageGradient: 'from-indigo-600 via-violet-600 to-purple-700',
      icon: '🔬',
      status: 'activo',
      hours: 0,
      instructor: '',
      capacity: 100,
      coverUrl: '',
      registrationStartDate: '',
      registrationEndDate: '',
      courseStartDate: '',
      courseEndDate: '',
    });
    this.showEventModal.set(true);
  }

  openEditEvent(event: EventItem): void {
    this.isEditing.set(true);
    this.editorInitialContent = event.description || '';
    this.eventForm.set({
      id: event.id,
      title: event.title,
      type: event.type,
      date: event.date,
      description: event.description,
      fullDescription: event.fullDescription,
      imageGradient: event.imageGradient,
      icon: event.icon,
      status: event.status,
      hours: event.hours,
      instructor: event.instructor,
      capacity: event.capacity,
      coverUrl: event.coverUrl || '',
      registrationStartDate: event.registrationStartDate || '',
      registrationEndDate: event.registrationEndDate || '',
      courseStartDate: event.courseStartDate || '',
      courseEndDate: event.courseEndDate || '',
    });
    this.showEventModal.set(true);
  }

  onBannerSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.bannerFile = file; // Guardar el archivo real para subirlo al servidor
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.eventForm.update(f => ({ ...f, coverUrl: e.target.result }));
      };
      reader.readAsDataURL(file);
    }
  }

  getInstructorsList(): string[] {
    const value = this.eventForm().instructor || '';
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }

  addInstructor(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.getInstructorsList();
    if (!current.includes(trimmed)) {
      current.push(trimmed);
      this.eventForm.update(f => ({ ...f, instructor: current.join(', ') }));
    }
  }

  removeInstructor(name: string): void {
    const current = this.getInstructorsList().filter(n => n !== name);
    this.eventForm.update(f => ({ ...f, instructor: current.join(', ') }));
  }

  onEditorInput(html: string): void {
    this.eventForm.update(f => ({ ...f, description: html, fullDescription: html }));
  }

  execFormat(command: string, value: string = ''): void {
    document.execCommand(command, false, value);
    const editor = document.querySelector('[contenteditable]');
    if (editor) {
      this.onEditorInput(editor.innerHTML);
    }
  }

  execLink(): void {
    const url = prompt('Ingrese la URL del enlace:');
    if (url) {
      document.execCommand('createLink', false, url);
      const editor = document.querySelector('[contenteditable]');
      if (editor) {
        this.onEditorInput(editor.innerHTML);
      }
    }
  }

  execUnlink(): void {
    document.execCommand('unlink', false);
    const editor = document.querySelector('[contenteditable]');
    if (editor) {
      this.onEditorInput(editor.innerHTML);
    }
  }

  saveEvent(): void {
    const form = this.eventForm();
    this.saveEventError.set('');

    // Validate all required fields
    const missingFields: string[] = [];
    if (!form.title) missingFields.push('Título');
    if (!form.description) missingFields.push('Descripción');
    if (!form.hours || form.hours <= 0) missingFields.push('Horas Académicas');
    if (!form.registrationStartDate) missingFields.push('Inicio Inscripción');
    if (!form.registrationEndDate) missingFields.push('Fin Inscripción');
    if (!form.courseStartDate) missingFields.push('Inicio Curso');
    if (!form.courseEndDate) missingFields.push('Fin Curso');
    if (!form.type) missingFields.push('Tipo de Actividad');
    if (!form.instructor) missingFields.push('Docentes Expositores');
    if (!form.capacity || form.capacity <= 0) missingFields.push('Capacidad Máxima');

    if (missingFields.length > 0) {
      this.saveEventError.set('Campos requeridos faltantes: ' + missingFields.join(', '));
      return;
    }

    const eventDate = form.courseStartDate ? form.courseStartDate.split('T')[0] : (form.date || new Date().toISOString().split('T')[0]);

    let gradient = 'from-[#be123c] via-rose-700 to-amber-600';
    let icon = '🔐';
    if (form.type === 'Curso') {
      gradient = 'from-rose-600 via-pink-600 to-red-700';
      icon = '🅰️';
    } else if (form.type === 'Taller') {
      gradient = 'from-amber-500 via-orange-600 to-red-600';
      icon = '🎨';
    } else if (form.type === 'Repositorio') {
      gradient = 'from-indigo-600 via-violet-600 to-purple-700';
      icon = '🔬';
    }

    // Map type name to tipo_actividades id
    const tipoActividad = this.platformService.activityTypes().find(t => t.tipActividad === form.type);
    const tActividadId = tipoActividad ? tipoActividad.id : 1;

    const instructorsList = this.getInstructorsList();

    if (this.isEditing()) {
      // Construir FormData con el archivo de imagen si se seleccionó uno nuevo
      const formData = new FormData();
      formData.append('_method', 'PUT'); // Simulación de método PUT en Laravel
      formData.append('titulo', form.title);
      if (this.bannerFile) {
        formData.append('RBanner', this.bannerFile, this.bannerFile.name);
      }
      formData.append('descripcion', form.description);
      formData.append('HAcademica', String(form.hours));
      formData.append('InInscripcion', form.registrationStartDate || '');
      formData.append('FnInscripcion', form.registrationEndDate || '');
      formData.append('InCurso', form.courseStartDate || '');
      formData.append('FnCurso', form.courseEndDate || '');
      formData.append('TActividad', String(tActividadId));
      formData.append('DonceteExp', JSON.stringify(instructorsList));
      formData.append('CapMaxima', String(form.capacity));
      formData.append('Estado', form.status === 'activo' ? '1' : '0');

      this.savingEvent.set(true);

      this.apiService.postFormData<any>(`/eventos/${form.id}`, formData).subscribe({
        next: (resp) => {
          this.savingEvent.set(false);
          this.bannerFile = null;
          const updatedEvent = this.platformService.mapBackendEventoToEventItem(resp.data);
          this.platformService.editEvent(updatedEvent);
          this.showEventModal.set(false);
          alert('✅ Evento académico actualizado correctamente.');
        },
        error: (err) => {
          this.savingEvent.set(false);
          const backendMsg = err?.error?.message || err?.error?.errors;
          if (backendMsg && typeof backendMsg === 'object') {
            const msgs = Object.values(backendMsg).flat().join(' | ');
            this.saveEventError.set('Error de validación: ' + msgs);
          } else {
            this.saveEventError.set(backendMsg || 'Error al actualizar el evento.');
          }
        }
      });
    } else {
      // Creating: call backend API
      // Validar que se haya seleccionado una imagen de banner
      if (!this.bannerFile) {
        this.saveEventError.set('Debe seleccionar una imagen de banner.');
        return;
      }

      // Construir FormData con el archivo de imagen real
      const formData = new FormData();
      formData.append('titulo', form.title);
      formData.append('RBanner', this.bannerFile, this.bannerFile.name);
      formData.append('descripcion', form.description);
      formData.append('HAcademica', String(form.hours));
      formData.append('InInscripcion', form.registrationStartDate || '');
      formData.append('FnInscripcion', form.registrationEndDate || '');
      formData.append('InCurso', form.courseStartDate || '');
      formData.append('FnCurso', form.courseEndDate || '');
      formData.append('TActividad', String(tActividadId));
      formData.append('DonceteExp', JSON.stringify(instructorsList));
      formData.append('CapMaxima', String(form.capacity));
      formData.append('Estado', form.status === 'activo' ? '1' : '0');

      this.savingEvent.set(true);

      this.apiService.postFormData<any>('/eventos', formData).subscribe({
        next: (resp) => {
          this.savingEvent.set(false);
          this.bannerFile = null;
          const createdEvent = this.platformService.mapBackendEventoToEventItem(resp.data);
          this.platformService.addEvent(createdEvent);
          this.showEventModal.set(false);
          alert('✅ Evento académico creado correctamente y guardado en la base de datos.');
        },
        error: (err) => {
          this.savingEvent.set(false);
          const backendMsg = err?.error?.message || err?.error?.errors;
          if (backendMsg && typeof backendMsg === 'object') {
            const msgs = Object.values(backendMsg).flat().join(' | ');
            this.saveEventError.set('Error de validación: ' + msgs);
          } else {
            this.saveEventError.set(backendMsg || 'Error al crear el evento. Verifique que ha iniciado sesión.');
          }
        }
      });
    }
  }

  deleteEvent(id: any): void {
    if (confirm('¿Está seguro de eliminar este evento? Se eliminarán de forma permanente todos sus registros e inscripciones.')) {
      this.apiService.delete<any>(`/eventos/${id}`).subscribe({
        next: (resp) => {
          this.platformService.deleteEvent(id);
          alert('✅ Evento eliminado correctamente.');
        },
        error: (err) => {
          console.error('Error deleting event:', err);
          alert('❌ Error al eliminar el evento de la base de datos.');
        }
      });
    }
  }

  // --- REGISTRATIONS HANDLERS ---
  approveReg(regId: number): void {
    this.platformService.updateRegistrationStatus(regId, 'Aprobado');
  }

  rejectReg(regId: number): void {
    if (confirm('¿Está seguro de rechazar y eliminar permanentemente esta inscripción?')) {
      this.apiService.delete<any>(`/matriculas/${regId}`).subscribe({
        next: (resp) => {
          alert('✅ Inscripción eliminada correctamente.');
          this.platformService.loadRegistrations(); // reload registrations from database
        },
        error: (err) => {
          console.error('Error al eliminar inscripción:', err);
          alert('❌ Error al eliminar la inscripción de la base de datos.');
        }
      });
    }
  }

  openAddRegistration(): void {
    this.saveRegistrationError.set('');
    this.savingRegistration.set(false);
    this.registrationForm.set({
      userDni: '',
      userName: '',
      userPaternalLastName: '',
      userMaternalLastName: '',
      userEmail: '',
      userPhone: '',
      userProcedencia: 'Interno',
      userTipoAsistente: 1,
      userGrado: '',
      eventId: this.platformService.events().find(e => e.status === 'activo' && e.type !== 'Repositorio')?.id || null,
    });
    this.showRegistrationModal.set(true);
  }

  saveRegistration(): void {
    const form = this.registrationForm();
    if (!form.userDni || !form.userName || !form.userPaternalLastName || !form.userMaternalLastName || !form.userEmail || !form.userPhone || !form.eventId) {
      this.saveRegistrationError.set('Todos los campos obligatorios deben completarse.');
      return;
    }

    this.savingRegistration.set(true);
    this.saveRegistrationError.set('');

    const payload = {
      DNI:           form.userDni.trim(),
      Nombres:       form.userName.trim(),
      ApPaterno:     form.userPaternalLastName.trim(),
      ApMaterno:     form.userMaternalLastName.trim(),
      Correo:        form.userEmail.trim(),
      NumCelular:    form.userPhone.trim(),
      Procedencia:   form.userProcedencia,
      TipoAsistente: form.userTipoAsistente,
      GradAcademico: form.userGrado.trim() || null,
      evento_id:     form.eventId,
    };

    this.apiService.post<any>('/matriculas', payload).subscribe({
      next: (resp) => {
        this.savingRegistration.set(false);
        if (resp.status === 'success') {
          this.showRegistrationModal.set(false);
          alert('✅ Inscripción registrada correctamente. Se ha enviado el correo de confirmación al participante.');
        } else {
          this.saveRegistrationError.set(resp.message || 'Error al registrar la inscripción.');
        }
      },
      error: (err) => {
        this.savingRegistration.set(false);
        const msg = err?.error?.message || 'Error al conectar con el servidor.';
        this.saveRegistrationError.set(msg);
      }
    });
  }

  // --- ATTENDANCE SYSTEM (TEACHER / COORD) ---
  readonly registeredStudentsForSelectedEvent = computed(() => {
    const eventId = this.selectedAttendanceEvent();
    if (!eventId) return [];

    const regs = this.platformService.registrations();
    // Filter approved students in this event
    return regs.filter((r) => r.eventId === eventId && r.status === 'Aprobado');
  });

  isStudentAttendant(studentEmail: string): boolean {
    const eventId = this.selectedAttendanceEvent();
    const date = this.selectedAttendanceDate();
    const records = this.platformService.attendances();

    const record = records.find(
      (a) => a.eventId === eventId && a.sessionDate === date
    );
    return record?.records[studentEmail] === true;
  }

  toggleAttendance(studentEmail: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const eventId = this.selectedAttendanceEvent();
    const date = this.selectedAttendanceDate();

    this.platformService.checkAttendance(eventId, date, studentEmail, checked);
  }

  // --- CERTIFICATE ISSUANCE ---
  readonly studentsEligibleForCertificate = computed(() => {
    // Approved students of completed events (or current ones for manual evaluation)
    const regs = this.platformService.registrations().filter(r => r.status === 'Aprobado');
    const certs = this.platformService.certificates();

    return regs.map((r) => {
      const cert = certs.find((c) => c.dni === r.userDni && c.eventId === r.eventId);
      const alreadyHasCert = !!cert;
      return {
        ...r,
        alreadyHasCert,
        cert,
        isPaymentValidated: r.isPaymentValidated === true,
      };
    });
  });

  loadFondoAndShowCert(eventId: any, tipoAsistenteId: number, participantData: any): void {
    this.apiService.get<any>('/e-documentos/fondo-base64', { 
      evento_id: eventId, 
      tipo_asistente: tipoAsistenteId 
    }).subscribe({
      next: (resp) => {
        if (resp && resp.status === 'success') {
          this.certFondoBase64.set(resp.fondo_base64 || null);
          this.certDocData.set(resp.e_documento || null);
        } else {
          this.certFondoBase64.set(null);
          this.certDocData.set(null);
        }
        this.certParticipantData.set(participantData);
        this.showCertWithBackground.set(true);
      },
      error: (err) => {
        console.warn('No se pudo cargar el fondo del certificado:', err);
        this.certFondoBase64.set(null);
        this.certDocData.set(null);
        this.certParticipantData.set(participantData);
        this.showCertWithBackground.set(true);
      }
    });
  }

  issueCert(regId: number): void {
    this.apiService.patch<any>(`/matriculas/${regId}/emitir-certificado`, {}).subscribe({
      next: (resp) => {
        alert('🎓 Certificado emitido correctamente.');
        this.platformService.loadRegistrations(); // refresh list
        
        // Find the registration from current list to get details
        const reg = this.platformService.registrations().find(r => r.id === regId);
        if (reg) {
          const participantData = {
            code: resp.documento?.Id_Documento || reg.documentCode || 'No asignado',
            fullName: reg.userName,
            dni: reg.userDni,
            eventId: reg.eventId,
            eventTitle: reg.eventTitle,
            issueDate: new Date().toISOString().split('T')[0],
          };
          this.loadFondoAndShowCert(reg.eventId, reg.tipoAsistenteId || 1, participantData);
        }
      },
      error: (err) => {
        console.error('Error al emitir certificado:', err);
        alert('❌ Error al emitir el certificado.');
      }
    });
  }

  toggleCertStatus(code: string): void {
    this.platformService.toggleCertificateStatus(code);
  }

  // --- PARTICIPANT FLOWS ---
  readonly myRegistrations = computed(() => {
    const user = this.platformService.currentUser();
    if (!user) return [];
    return this.platformService.registrations().filter((r) => r.userEmail === user.email);
  });

  readonly myCertificates = computed(() => {
    const user = this.platformService.currentUser();
    if (!user) return [];
    return this.platformService.certificates().filter((c) => c.dni === user.dni);
  });

  readonly upcomingEventsForParticipant = computed(() => {
    const myRegs = this.myRegistrations();
    return this.platformService.events().filter(
      (e) => e.status === 'activo' && e.type !== 'Repositorio' && !myRegs.some((r) => r.eventId === e.id)
    );
  });

  registerQuicklyToEvent(eventId: number): void {
    const user = this.platformService.currentUser();
    if (!user) return;
    const res = this.platformService.registerToEvent(user.dni, user.name, user.email, eventId);
    alert(res.message);
  }

  // Visualizer integration
  viewCertificate(cert: Certificate): void {
    this.showPrintCertModal.set(false);
    this.showResolutionModal.set(false);
    
    const reg = this.platformService.registrations().find(
      r => r.userDni === cert.dni && r.eventId === cert.eventId
    );
    const tipoAsistenteId = reg ? reg.tipoAsistenteId : 1;
    
    this.apiService.get<any>('/e-documentos/fondo-base64', { 
      evento_id: cert.eventId, 
      tipo_asistente: tipoAsistenteId 
    }).subscribe({
      next: (resp) => {
        if (resp && resp.status === 'success' && resp.fondo_base64) {
          this.certFondoBase64.set(resp.fondo_base64);
          this.certDocData.set(resp.e_documento);
          this.certParticipantData.set({
            code: cert.code,
            fullName: cert.fullName,
            dni: cert.dni,
            eventId: cert.eventId,
            eventTitle: cert.eventTitle,
            issueDate: cert.issueDate
          });
          this.showCertWithBackground.set(true);
        } else {
          this.activeCertificate.set(cert);
        }
      },
      error: (err) => {
        this.activeCertificate.set(cert);
      }
    });
  }

  closeCertificateModal(): void {
    this.activeCertificate.set(null);
  }

  downloadCertificate(): void {
    window.print();
  }

  viewAndDownload(cert: Certificate): void {
    const reg = this.platformService.registrations().find(
      r => r.userDni === cert.dni && r.eventId === cert.eventId
    );
    const tipoAsistenteId = reg ? reg.tipoAsistenteId : 1;
    
    this.apiService.get<any>('/e-documentos/fondo-base64', { 
      evento_id: cert.eventId, 
      tipo_asistente: tipoAsistenteId 
    }).subscribe({
      next: (resp) => {
        if (resp && resp.status === 'success' && resp.fondo_base64) {
          this.certFondoBase64.set(resp.fondo_base64);
          this.certDocData.set(resp.e_documento);
          this.certParticipantData.set({
            code: cert.code,
            fullName: cert.fullName,
            dni: cert.dni,
            eventId: cert.eventId,
            eventTitle: cert.eventTitle,
            issueDate: cert.issueDate
          });
          this.showCertWithBackground.set(true);
          setTimeout(() => {
            this.downloadCertificate();
          }, 1000);
        } else {
          this.activeCertificate.set(cert);
          this.showPrintCertModal.set(true);
          setTimeout(() => {
            this.downloadCertificate();
          }, 1000);
        }
      },
      error: (err) => {
        this.activeCertificate.set(cert);
        this.showPrintCertModal.set(true);
        setTimeout(() => {
          this.downloadCertificate();
        }, 1000);
      }
    });
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
      if (isNaN(dateObj.getTime())) {
        return dateStr;
      }
      const months = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      return `${dateObj.getDate()} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
    } catch (e) {
      return dateStr;
    }
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

  // --- MOCK EXPORT TO EXCEL ---
  exportUsersExcel(): void {
    const headers = ['Nombre Completo', 'DNI', 'Correo Electrónico', 'Rol Institucional'];
    const data = this.platformService.users().map(u => [u.name, u.dni, u.email, u.role]);
    this.platformService.exportToCsv('Reporte_Usuarios_Plataforma', headers, data);
  }

  exportEventsExcel(): void {
    const headers = ['Título del Evento', 'Tipo', 'Fecha Programada', 'Capacidad', 'Inscritos', 'Estado'];
    const data = this.platformService.events().map(e => [e.title, e.type, e.date, e.capacity, e.registeredCount, e.status]);
    this.platformService.exportToCsv('Reporte_Eventos_Plataforma', headers, data);
  }

  exportCertificatesExcel(): void {
    const headers = ['Código de Certificado', 'Nombre del Alumno', 'DNI', 'Curso / Evento', 'Fecha de Emisión', 'Estado de Validez'];
    const data = this.platformService.certificates().map(c => [c.code, c.fullName, c.dni, c.eventTitle, c.issueDate, c.status]);
    this.platformService.exportToCsv('Reporte_Certificados_Emitidos', headers, data);
  }

  private loadDataTimeout: any = null;

  // --- DATA INTERNA CRUD & IMPORT ---
  loadInternalData(): void {
    if (!this.platformService.isLoggedIn()) return;

    if (this.loadDataTimeout) {
      clearTimeout(this.loadDataTimeout);
    }

    this.loadDataTimeout = setTimeout(() => {
      this.loadingInternalData.set(true);

      const params = {
        page: this.internalCurrentPage().toString(),
        per_page: this.internalPageSize().toString(),
        search: this.internalSearchQuery(),
        sort_by: this.internalSortColumn(),
        sort_dir: this.internalSortDirection()
      };

      this.apiService.get<any>('/data-interna', params).subscribe({
        next: (resp) => {
          this.loadingInternalData.set(false);
          if (resp && Array.isArray(resp.data)) {
            this.internalDataList.set(resp.data);
            this.totalInternalItems.set(resp.total);
          }
        },
        error: (err) => {
          this.loadingInternalData.set(false);
          console.error('Error al cargar información interna:', err);
        }
      });
    }, 150);
  }

  openAddInternal(): void {
    this.isEditing.set(false);
    this.internalForm.set({
      DNI: '',
      Procedencia: 'Interno',
      TipoAsistente: 'Estudiante',
      Nombres: '',
      ApPaterno: '',
      ApMaterno: '',
      Grado: '',
      Correo: '',
      NumCelular: '',
    });
    this.showInternalModal.set(true);
  }

  openEditInternal(item: any): void {
    this.isEditing.set(true);
    this.internalForm.set({
      DNI: item.DNI,
      Procedencia: item.Procedencia,
      TipoAsistente: item.TipoAsistente,
      Nombres: item.Nombres,
      ApPaterno: item.ApPaterno,
      ApMaterno: item.ApMaterno,
      Grado: item.Grado || '',
      Correo: item.Correo || '',
      NumCelular: item.NumCelular || '',
    });
    this.showInternalModal.set(true);
  }

  saveInternal(): void {
    const rawForm = this.internalForm();
    const form = {
      ...rawForm,
      DNI: rawForm.DNI.toUpperCase().trim(),
      Nombres: rawForm.Nombres.toUpperCase().trim(),
      ApPaterno: rawForm.ApPaterno.toUpperCase().trim(),
      ApMaterno: rawForm.ApMaterno.toUpperCase().trim(),
      Grado: rawForm.Grado ? rawForm.Grado.toUpperCase().trim() : '',
      Correo: rawForm.Correo ? rawForm.Correo.toUpperCase().trim() : '',
      NumCelular: rawForm.NumCelular ? rawForm.NumCelular.trim() : ''
    };

    if (!form.DNI || !form.Nombres || !form.ApPaterno || !form.ApMaterno) {
      alert('DNI, Nombres y Apellidos son obligatorios.');
      return;
    }

    if (this.isEditing()) {
      this.apiService.put<any>(`/data-interna/${form.DNI}`, form).subscribe({
        next: (resp) => {
          alert('✅ Registro interno actualizado con éxito.');
          this.showInternalModal.set(false);
          this.loadInternalData();
        },
        error: (err) => {
          alert('❌ Error al actualizar el registro: ' + (err?.error?.message || 'Error del servidor'));
        }
      });
    } else {
      this.apiService.post<any>('/data-interna', form).subscribe({
        next: (resp) => {
          alert('✅ Registro interno creado con éxito.');
          this.showInternalModal.set(false);
          this.loadInternalData();
        },
        error: (err) => {
          alert('❌ Error al crear el registro: ' + (err?.error?.message || 'El DNI ya existe o error de servidor'));
        }
      });
    }
  }

  deleteInternal(dni: string): void {
    if (confirm('¿Está seguro de eliminar este registro interno?')) {
      this.apiService.delete<any>(`/data-interna/${dni}`).subscribe({
        next: () => {
          alert('✅ Registro eliminado correctamente.');
          this.loadInternalData();
        },
        error: (err) => {
          console.error('Error al eliminar registro:', err);
          alert('❌ Error al eliminar el registro de la base de datos.');
        }
      });
    }
  }

  openImportModal(): void {
    this.importError.set('');
    this.importResult.set('');
    this.importingCsv.set(false);
    this.showImportModal.set(true);
  }

  onCsvFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file, file.name);

    this.importingCsv.set(true);
    this.importError.set('');
    this.importResult.set('');

    this.apiService.postFormData<any>('/data-interna/import', formData).subscribe({
      next: (resp) => {
        this.importingCsv.set(false);
        this.importResult.set(resp.message);
        if (resp.errors && resp.errors.length > 0) {
          this.importError.set('Algunas filas tuvieron advertencias:\n' + resp.errors.join('\n'));
        }
        this.loadInternalData();
      },
      error: (err) => {
        this.importingCsv.set(false);
        this.importError.set(err?.error?.message || 'Error de conexión o de formato en el archivo.');
      }
    });
  }

  // --- RESOLUTION & DIPLOMA TEMPLATE SYSTEM (e_documentos) ---
  selectedCourseForDocs = signal<EventItem | null>(null);
  showDocsConfigModal = signal<boolean>(false);
  loadingDocsConfig = signal<boolean>(false);
  savingDocsConfig = signal<boolean>(false);
  docsConfigList = signal<any[]>([]); // holds EDocumento array for current event

  docsForm = signal<{
    id?: string;
    pdfResolucion?: string;
    Fondo?: string;
    Resolucion: string;
    Tipo: string;
    Texto01: string;
    Texto02: string;
    FechEmision: string;
    Firma01: string;
    Firma02: string;
    Firma03: string;
    TipoAsistente: number;
  }>({
    Resolucion: '',
    pdfResolucion: '',
    Fondo: '',
    Tipo: '',
    Texto01: '',
    Texto02: '',
    FechEmision: '',
    Firma01: '',
    Firma02: '',
    Firma03: '',
    TipoAsistente: 1
  });

  enableFirma01 = signal<boolean>(false);
  enableFirma02 = signal<boolean>(false);
  enableFirma03 = signal<boolean>(false);

  toggleFirma01(val: boolean): void {
    this.enableFirma01.set(val);
    if (!val) {
      this.docsForm.update(f => ({ ...f, Firma01: '' }));
    }
  }

  toggleFirma02(val: boolean): void {
    this.enableFirma02.set(val);
    if (!val) {
      this.docsForm.update(f => ({ ...f, Firma02: '' }));
    }
  }

  toggleFirma03(val: boolean): void {
    this.enableFirma03.set(val);
    if (!val) {
      this.docsForm.update(f => ({ ...f, Firma03: '' }));
    }
  }

  selectedPdfFile = signal<File | null>(null);
  selectedFondoFile = signal<File | null>(null);

  onPdfFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('❌ Por favor, seleccione un archivo PDF válido.');
        event.target.value = '';
        return;
      }
      this.selectedPdfFile.set(file);
    }
  }

  onFondoFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('❌ Por favor, seleccione una imagen válida para el fondo.');
        event.target.value = '';
        return;
      }
      this.selectedFondoFile.set(file);
    }
  }

  resetDocsForm(tipoAsistenteId: number = 1): void {
    this.docsForm.set({
      Resolucion: '',
      pdfResolucion: '',
      Fondo: '',
      Tipo: '',
      Texto01: '',
      Texto02: '',
      FechEmision: '',
      Firma01: '',
      Firma02: '',
      Firma03: '',
      TipoAsistente: tipoAsistenteId
    });
    this.enableFirma01.set(false);
    this.enableFirma02.set(false);
    this.enableFirma03.set(false);
    
    // Clear files
    this.selectedPdfFile.set(null);
    this.selectedFondoFile.set(null);
    const pdfInput = document.getElementById('resolucionPdfInput') as HTMLInputElement;
    if (pdfInput) pdfInput.value = '';
    const fondoInput = document.getElementById('docsFondoInput') as HTMLInputElement;
    if (fondoInput) fondoInput.value = '';
  }

  selectCourseForDocs(event: EventItem): void {
    this.selectedCourseForDocs.set(event);
    this.resetDocsForm(1);
    this.loadCourseDocsConfig(event.id, false);
    this.showDocsConfigModal.set(true);
  }

  loadCourseDocsConfig(eventId: any, autoLoadForm: boolean = true): void {
    this.loadingDocsConfig.set(true);
    this.apiService.get<any[]>('/e-documentos', { evento_id: eventId }).subscribe({
      next: (data) => {
        this.loadingDocsConfig.set(false);
        if (Array.isArray(data)) {
          this.docsConfigList.set(data);
          if (autoLoadForm) {
            // Auto select Assistant Type config if it exists
            this.selectAsistenteTypeForDocs(this.docsForm().TipoAsistente);
          }
        }
      },
      error: (err) => {
        this.loadingDocsConfig.set(false);
        console.error('Error al cargar configuración de documentos:', err);
      }
    });
  }

  selectAsistenteTypeForDocs(tipoId: number): void {
    // Clear selected files when switching assistant types
    this.selectedPdfFile.set(null);
    this.selectedFondoFile.set(null);
    
    const pdfInput = document.getElementById('resolucionPdfInput') as HTMLInputElement;
    if (pdfInput) pdfInput.value = '';
    
    const fondoInput = document.getElementById('docsFondoInput') as HTMLInputElement;
    if (fondoInput) fondoInput.value = '';

    // Update selected TipoAsistente in form
    this.docsForm.update(f => ({ ...f, TipoAsistente: tipoId }));

    // Check if configuration exists in the loaded list
    const existing = this.docsConfigList().find(c => Number(c.TipoAsistente) === Number(tipoId));
    if (existing) {
      this.docsForm.set({
        id: existing.id,
        pdfResolucion: existing.pdfResolucion || '',
        Fondo: existing.Fondo || '',
        Resolucion: existing.Resolucion || '',
        Tipo: existing.Tipo || '',
        Texto01: existing.Texto01 || '',
        Texto02: existing.Texto02 || '',
        FechEmision: existing.FechEmision ? existing.FechEmision.substring(0, 10) : '',
        Firma01: existing.Firma01 || '',
        Firma02: existing.Firma02 || '',
        Firma03: existing.Firma03 || '',
        TipoAsistente: tipoId
      });
      this.enableFirma01.set(!!existing.Firma01);
      this.enableFirma02.set(!!existing.Firma02);
      this.enableFirma03.set(!!existing.Firma03);
    } else {
      // Load defaults
      this.docsForm.set({
        Resolucion: '',
        pdfResolucion: '',
        Fondo: '',
        Tipo: '',
        Texto01: '',
        Texto02: '',
        FechEmision: '',
        Firma01: '',
        Firma02: '',
        Firma03: '',
        TipoAsistente: tipoId
      });
      this.enableFirma01.set(false);
      this.enableFirma02.set(false);
      this.enableFirma03.set(false);
    }
  }

  saveDocsConfig(): void {
    const course = this.selectedCourseForDocs();
    if (!course) return;

    this.savingDocsConfig.set(true);
    const form = this.docsForm();

    const formData = new FormData();
    if (form.id) {
      formData.append('id', form.id);
    }
    formData.append('Id_evento', course.id);
    formData.append('TipoAsistente', String(form.TipoAsistente));
    formData.append('Resolucion', form.Resolucion || '');
    formData.append('Tipo', form.Tipo || '');
    formData.append('Texto01', form.Texto01 || '');
    formData.append('Texto02', form.Texto02 || '');
    formData.append('FechEmision', form.FechEmision || '');
    formData.append('Firma01', form.Firma01 || '');
    formData.append('Firma02', form.Firma02 || '');
    formData.append('Firma03', form.Firma03 || '');

    const pdfFile = this.selectedPdfFile();
    if (pdfFile) {
      formData.append('pdfResolucion', pdfFile);
    }

    const fondoFile = this.selectedFondoFile();
    if (fondoFile) {
      formData.append('Fondo', fondoFile);
    }

    this.apiService.postFormData<any>('/e-documentos', formData).subscribe({
      next: (resp) => {
        this.savingDocsConfig.set(false);
        alert('✅ Configuración del documento guardada con éxito.');
        // Reset form to empty state
        this.resetDocsForm(form.TipoAsistente);
        // Refresh local list without reloading the form
        this.loadCourseDocsConfig(course.id, false);
      },
      error: (err) => {
        this.savingDocsConfig.set(false);
        console.error('Error al guardar configuración:', err);
        alert('❌ Error al guardar la configuración: ' + (err?.error?.message || 'Error de servidor'));
      }
    });
  }

  deleteDocsConfig(config: any): void {
    if (!confirm(`¿Está seguro de eliminar la configuración para el rol "${config.tipo_asistente_rel?.AsigTipo || 'ASISTENTE'}"?`)) {
      return;
    }

    const course = this.selectedCourseForDocs();
    if (!course) return;

    this.apiService.delete<any>(`/e-documentos/${config.id}`).subscribe({
      next: (resp) => {
        alert('✅ Configuración eliminada con éxito.');
        // Reset form to empty state in case it was loading the deleted config
        this.resetDocsForm(this.docsForm().TipoAsistente);
        // Refresh local list without reloading the form
        this.loadCourseDocsConfig(course.id, false);
      },
      error: (err) => {
        console.error('Error al eliminar configuración:', err);
        alert('❌ Error al eliminar la configuración: ' + (err?.error?.message || 'Error de servidor'));
      }
    });
  }
}
