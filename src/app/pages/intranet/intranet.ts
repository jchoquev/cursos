import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, EventItem, UserItem, Registration, Certificate } from '../../services/platform.service';
import { SearchCertificates } from '../search-certificates/search-certificates';

@Component({
  selector: 'app-intranet',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './intranet.html',
  styleUrl: './intranet.css',
})
export class IntranetComponent {
  readonly platformService = inject(PlatformService);

  // Auth Inputs
  emailInput = '';
  passwordInput = '';
  loginError = '';

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

  // Verification Screen Refinements Signals
  showResolutionModal = signal<boolean>(false);
  showPrintCertModal = signal<boolean>(false);

  // CRUD Forms State
  isEditing = signal<boolean>(false);

  // User form data
  userForm = {
    email: '',
    name: '',
    role: 'Caja' as UserItem['role'],
    dni: '',
    password: '',
  };
  originalUserEmail = ''; // for tracking changes

  // Event form data
  eventForm = {
    id: 0,
    title: '',
    type: 'Curso' as EventItem['type'],
    date: '',
    description: '',
    fullDescription: '',
    imageGradient: 'from-wine-700 to-wine-900',
    icon: '📚',
    status: 'activo' as EventItem['status'],
    hours: 20,
    instructor: '',
    capacity: 30,
  };

  // Attendance form state
  selectedAttendanceEvent = signal<number>(0);
  selectedAttendanceDate = signal<string>(new Date().toISOString().split('T')[0]);

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

  getPagesArray(totalPages: number): number[] {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  getMinRecord(page: number, size: number, total: number): number {
    return Math.min(page * size, total);
  }

  // --- PAYMENT VALIDATION STATE & METHODS ---
  showPaymentModal = signal<boolean>(false);
  selectedRegistrationId = 0;
  paymentReceiptNumber = '';
  paymentDate = '';
  paymentAmount = 150.00;
  paymentImage = '';

  openValidatePayment(reg: Registration): void {
    this.selectedRegistrationId = reg.id;
    this.paymentReceiptNumber = '';
    this.paymentDate = new Date().toISOString().split('T')[0];
    this.paymentAmount = 150.00;
    this.paymentImage = '';
    this.showPaymentModal.set(true);
  }

  onReceiptFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.paymentImage = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  submitPaymentValidation(): void {
    if (!this.paymentReceiptNumber || !this.paymentDate || !this.paymentAmount) {
      alert('Por favor complete todos los datos del recibo.');
      return;
    }

    this.platformService.validatePaymentAndApprove(
      this.selectedRegistrationId,
      this.paymentReceiptNumber,
      this.paymentDate,
      this.paymentAmount,
      this.paymentImage || 'https://images.unsplash.com/photo-1554416278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80'
    );

    this.showPaymentModal.set(false);
    alert('Pago validado correctamente e inscripción aprobada.');
  }

  constructor() {
    // If logged in, set default tab
    this.updateDefaultTab();
  }

  // --- AUTH PROCEDURES ---

  handleLogin(): void {
    this.loginError = '';
    const success = this.platformService.login(this.emailInput, this.passwordInput);
    if (success) {
      this.emailInput = '';
      this.passwordInput = '';
      this.updateDefaultTab();
    } else {
      this.loginError = 'Credenciales incorrectas. Intente nuevamente.';
    }
  }

  quickLogin(role: 'admin' | 'caja' | 'formacion' | 'investigacion'): void {
    this.loginError = '';
    let email = '';
    if (role === 'admin') email = 'admin@institucion.edu';
    else if (role === 'caja') email = 'caja@institucion.edu';
    else if (role === 'formacion') email = 'formacion@institucion.edu';
    else if (role === 'investigacion') email = 'investigacion@institucion.edu';

    this.platformService.login(email);
    this.updateDefaultTab();
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
    this.userForm = {
      email: '',
      name: '',
      role: 'Caja',
      dni: '',
      password: '',
    };
    this.showUserModal.set(true);
  }

  openEditUser(user: UserItem): void {
    this.isEditing.set(true);
    this.originalUserEmail = user.email;
    this.userForm = {
      email: user.email,
      name: user.name,
      role: user.role,
      dni: user.dni,
      password: user.password || 'part123',
    };
    this.showUserModal.set(true);
  }

  saveUser(): void {
    if (!this.userForm.email || !this.userForm.name || !this.userForm.dni) return;

    if (this.isEditing()) {
      const updatedUser: UserItem = {
        email: this.userForm.email,
        name: this.userForm.name,
        role: this.userForm.role,
        dni: this.userForm.dni,
        password: this.userForm.password,
      };
      this.platformService.editUser(updatedUser, this.originalUserEmail);
    } else {
      // Auto-generar contraseña segura (se enviará al correo del usuario)
      const autoPassword = this.generateSecurePassword();
      const newUser: UserItem = {
        email: this.userForm.email,
        name: this.userForm.name,
        role: this.userForm.role,
        dni: this.userForm.dni,
        password: autoPassword,
      };
      this.platformService.addUser(newUser);
      // Simular notificación de envío por correo
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
  openAddEvent(): void {
    this.isEditing.set(false);
    this.eventForm = {
      id: 0,
      title: '',
      type: 'Curso',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days in future
      description: '',
      fullDescription: '',
      imageGradient: 'from-rose-600 via-pink-600 to-red-700',
      icon: '📚',
      status: 'activo',
      hours: 30,
      instructor: '',
      capacity: 35,
    };
    this.showEventModal.set(true);
  }

  openAddProject(): void {
    this.isEditing.set(false);
    this.eventForm = {
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
    } as EventItem;
    this.showEventModal.set(true);
  }

  openEditEvent(event: EventItem): void {
    this.isEditing.set(true);
    this.eventForm = {
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
    };
    this.showEventModal.set(true);
  }

  saveEvent(): void {
    if (!this.eventForm.title || !this.eventForm.date || !this.eventForm.instructor) return;

    // Pick a matching gradient and icon automatically based on type for visual perfection
    let gradient = 'from-[#be123c] via-rose-700 to-amber-600';
    let icon = '🔐';
    if (this.eventForm.type === 'Curso') {
      gradient = 'from-rose-600 via-pink-600 to-red-700';
      icon = '🅰️';
    } else if (this.eventForm.type === 'Taller') {
      gradient = 'from-amber-500 via-orange-600 to-red-600';
      icon = '🎨';
    } else if (this.eventForm.type === 'Repositorio') {
      gradient = 'from-indigo-600 via-violet-600 to-purple-700';
      icon = '🔬';
    }

    if (this.isEditing()) {
      const updated: EventItem = {
        ...this.eventForm,
        imageGradient: gradient,
        icon: icon,
        registeredCount: this.platformService.events().find(e => e.id === this.eventForm.id)?.registeredCount || 0,
      };
      this.platformService.editEvent(updated);
    } else {
      const newEventData: Omit<EventItem, 'id' | 'registeredCount'> = {
        title: this.eventForm.title,
        type: this.eventForm.type,
        date: this.eventForm.date,
        description: this.eventForm.description,
        fullDescription: this.eventForm.fullDescription || this.eventForm.description,
        imageGradient: gradient,
        icon: icon,
        status: this.eventForm.status,
        hours: this.eventForm.hours,
        instructor: this.eventForm.instructor,
        capacity: this.eventForm.capacity,
      };
      this.platformService.addEvent(newEventData);
    }
    this.showEventModal.set(false);
  }

  deleteEvent(id: number): void {
    if (confirm('¿Está seguro de eliminar este evento? Se eliminarán de forma permanente todos sus registros e inscripciones.')) {
      this.platformService.deleteEvent(id);
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
}
