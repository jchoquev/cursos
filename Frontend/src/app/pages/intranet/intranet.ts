import { Component, signal, computed, inject, OnInit, OnDestroy, PLATFORM_ID, afterNextRender, effect, untracked } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, EventItem, UserItem, Registration, Certificate } from '../../services/platform.service';
import { ApiService } from '../../services/api.service';
import { SearchCertificates } from '../search-certificates/search-certificates';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';

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

  // Event save state
  savingEvent = signal<boolean>(false);
  saveEventError = signal<string>('');
  bannerFile: File | null = null;  // Archivo de imagen real para subir al servidor

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

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
      this.loadInternalData();
      if (this.platformService.userRole() === 'Administrador') {
        this.platformService.loadUsers();
      }
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId) && this.editor) {
      this.editor.destroy();
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
  regSearchQuery = signal<string>('');
  regSortColumn = signal<string>('userName');
  regSortDirection = signal<'asc' | 'desc'>('asc');
  regCurrentPage = signal<number>(1);
  regPageSize = signal<number>(5);

  readonly filteredAndPaginatedRegistrations = computed(() => {
    const query = this.regSearchQuery().toLowerCase().trim();
    const sortCol = this.regSortColumn();
    const sortDir = this.regSortDirection();
    const page = this.regCurrentPage();
    const size = this.regPageSize();

    let list = this.platformService.registrations().filter(r => r.status === 'Pendiente');

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
  certSearchQuery = signal<string>('');
  certFilterYear = signal<string>('');
  certFilterCourse = signal<string>('');
  certSortColumn = signal<string>('code');
  certSortDirection = signal<'asc' | 'desc'>('asc');
  certCurrentPage = signal<number>(1);
  certPageSize = signal<number>(5);

  /** Años únicos extraídos de los certificados emitidos */
  readonly certAvailableYears = computed(() => {
    const years = this.platformService.certificates()
      .map(c => c.issueDate?.substring(0, 4))
      .filter((y): y is string => !!y);
    return [...new Set(years)].sort((a, b) => b.localeCompare(a));
  });

  /** Cursos/eventos únicos extraídos de los certificados */
  readonly certAvailableCourses = computed(() => {
    const courses = this.platformService.certificates()
      .map(c => c.eventTitle)
      .filter((e): e is string => !!e);
    return [...new Set(courses)].sort();
  });

  readonly filteredAndPaginatedCertificates = computed(() => {
    const query = this.certSearchQuery().toLowerCase().trim();
    const filterYear = this.certFilterYear();
    const filterCourse = this.certFilterCourse();
    const sortCol = this.certSortColumn();
    const sortDir = this.certSortDirection();
    const page = this.certCurrentPage();
    const size = this.certPageSize();

    let list = [...this.platformService.certificates()];

    if (filterYear) {
      list = list.filter(c => c.issueDate?.startsWith(filterYear));
    }

    if (filterCourse) {
      list = list.filter(c => c.eventTitle === filterCourse);
    }

    if (query) {
      list = list.filter(c =>
        c.code.toLowerCase().includes(query) ||
        c.fullName.toLowerCase().includes(query) ||
        c.dni.includes(query) ||
        c.eventTitle.toLowerCase().includes(query) ||
        c.status.toLowerCase().includes(query)
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

  changeCertSort(column: string): void {
    if (this.certSortColumn() === column) {
      this.certSortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.certSortColumn.set(column);
      this.certSortDirection.set('asc');
    }
    this.certCurrentPage.set(1);
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
  paymentAmount = signal<number>(150.00);
  paymentImage = signal<string>('');

  openValidatePayment(reg: Registration): void {
    this.selectedRegistrationId.set(reg.id);
    this.paymentReceiptNumber.set('');
    this.paymentDate.set(new Date().toISOString().split('T')[0]);
    this.paymentAmount.set(150.00);
    this.paymentImage.set('');
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
    if (!this.paymentReceiptNumber() || !this.paymentDate() || !this.paymentAmount()) {
      alert('Por favor complete todos los datos del recibo.');
      return;
    }

    this.platformService.validatePaymentAndApprove(
      this.selectedRegistrationId(),
      this.paymentReceiptNumber(),
      this.paymentDate(),
      this.paymentAmount(),
      this.paymentImage() || 'https://images.unsplash.com/photo-1554416278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80'
    );

    this.showPaymentModal.set(false);
    alert('Pago validado correctamente e inscripción aprobada.');
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

    const pendingRegs = regs.filter(r => r.status === 'Pendiente').length;
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

    if (this.isEditing()) {
      const updatedUser: UserItem = {
        email: form.email,
        name: form.name,
        role: form.role,
        dni: form.dni,
        password: form.password,
      };
      this.platformService.editUser(updatedUser, this.originalUserEmail());
    } else {
      const autoPassword = this.generateSecurePassword();
      const newUser: UserItem = {
        email: form.email,
        name: form.name,
        role: form.role,
        dni: form.dni,
        password: autoPassword,
      };
      this.platformService.addUser(newUser);
      console.log(`[Correo simulado] → ${newUser.email} | Usuario: ${newUser.email} | Contraseña: ${autoPassword}`);
      alert(`✅ Usuario registrado. Se ha enviado un correo a ${newUser.email} con las credenciales de acceso.`);
    }

    this.showUserModal.set(false);
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
    this.platformService.updateRegistrationStatus(regId, 'Rechazado');
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
      const alreadyHasCert = certs.some((c) => c.dni === r.userDni && c.eventId === r.eventId);
      return {
        ...r,
        alreadyHasCert,
        isPaymentValidated: r.isPaymentValidated === true,
      };
    });
  });

  issueCert(dni: string, eventId: number): void {
    const result = this.platformService.emitCertificate(dni, eventId);
    alert(result.message + (result.code ? ` Código generado: ${result.code}` : ''));
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
    this.activeCertificate.set(cert);
  }

  closeCertificateModal(): void {
    this.activeCertificate.set(null);
  }

  downloadCertificate(): void {
    window.print();
  }

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

  getQrCodeSvg(code: string): string {
    return this.searchCertificatesHelper.getQrCodeSvg(code);
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
}
