import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiService } from './api.service';

export interface EventItem {
  id: any;
  title: string;
  type: string;
  date: string;
  description: string;
  fullDescription: string;
  imageGradient: string; // CSS gradient class for high aesthetics
  icon: string;
  status: 'activo' | 'pasado';
  hours: number;
  instructor: string;
  capacity: number;
  registeredCount: number;
  authors?: string;
  docType?: 'Thesis' | 'Artículo' | 'Proyecto';
  coverUrl?: string;
  registrationStartDate?: string;
  registrationEndDate?: string;
  courseStartDate?: string;
  courseEndDate?: string;
}

export interface UserItem {
  email: string;
  name: string;
  role: 'Administrador' | 'Caja' | 'Formación Continua' | 'Investigación';
  dni: string;
  password?: string; // stored for mock auth
}

export interface Registration {
  id: number;
  userEmail: string;
  userName: string;
  userDni: string;
  eventId: any;
  eventTitle: string;
  date: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  // Payment Validation fields
  isPaymentValidated?: boolean;
  receiptNumber?: string;
  receiptDate?: string;
  receiptAmount?: number;
  receiptImage?: string;
}

export interface Certificate {
  code: string;
  fullName: string;
  dni: string;
  eventId: any;
  eventTitle: string;
  issueDate: string;
  status: 'Válido' | 'Revocado';
  hours: number;
  signatureName: string;
  signatureRole: string;
}

export interface AttendanceRecord {
  eventId: any;
  sessionDate: string;
  records: { [email: string]: boolean }; // userEmail -> attended (true/false)
}

@Injectable({
  providedIn: 'root',
})
export class PlatformService {
  private readonly apiService = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);

  readonly activityTypes = signal<{ id: number; tipActividad: string }[]>([
    { id: 1, tipActividad: 'Curso' },
    { id: 2, tipActividad: 'Taller' },
    { id: 3, tipActividad: 'Seminario' },
  ]);

  constructor() {
    // Format all initial hardcoded/mock dates to DD/MM/YYYY
    this.events.update(list =>
      list.map(e => ({
        ...e,
        date: this.formatDate(e.date),
        registrationStartDate: e.registrationStartDate ? this.formatDate(e.registrationStartDate) : undefined,
        registrationEndDate: e.registrationEndDate ? this.formatDate(e.registrationEndDate) : undefined,
        courseStartDate: e.courseStartDate ? this.formatDate(e.courseStartDate) : undefined,
        courseEndDate: e.courseEndDate ? this.formatDate(e.courseEndDate) : undefined,
      }))
    );

    if (isPlatformBrowser(this.platformId)) {
      this.loadEvents();
      this.loadActivityTypes();
      if (this.isLoggedIn() && this.userRole() === 'Administrador') {
        this.loadUsers();
      }
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    let yyyymmdd = '';
    if (dateStr.includes('T')) {
      yyyymmdd = dateStr.split('T')[0];
    } else {
      yyyymmdd = dateStr.substring(0, 10);
    }
    if (yyyymmdd.length === 10 && yyyymmdd.includes('-')) {
      const parts = yyyymmdd.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return yyyymmdd;
  }

  mapBackendEventoToEventItem(item: any): EventItem {
    const typeName = item.tipo_actividad?.tipActividad || 'Curso';
    let gradient = 'from-[#be123c] via-rose-700 to-amber-600';
    let icon = '🔐';
    if (typeName === 'Curso') {
      gradient = 'from-rose-600 via-pink-600 to-red-700';
      icon = '🅰️';
    } else if (typeName === 'Taller') {
      gradient = 'from-amber-500 via-orange-600 to-red-600';
      icon = '🎨';
    } else if (typeName === 'Repositorio') {
      gradient = 'from-indigo-600 via-violet-600 to-purple-700';
      icon = '🔬';
    }

    let instructorStr = '';
    if (item.DonceteExp) {
      try {
        const teachers = typeof item.DonceteExp === 'string' ? JSON.parse(item.DonceteExp) : item.DonceteExp;
        if (Array.isArray(teachers)) {
          instructorStr = teachers.join(', ');
        } else {
          instructorStr = String(item.DonceteExp);
        }
      } catch (e) {
        instructorStr = String(item.DonceteExp);
      }
    }

    const coverUrl = item.RBanner ? `http://localhost:8000/storage/${item.RBanner}` : '';

    return {
      id: item.id,
      title: item.titulo,
      type: typeName,
      date: this.formatDate(item.InCurso),
      description: item.descripcion,
      fullDescription: item.descripcion,
      imageGradient: gradient,
      icon: icon,
      status: item.Estado ? 'activo' : 'pasado',
      hours: Number(item.HAcademica),
      instructor: instructorStr,
      capacity: Number(item.CapMaxima),
      registeredCount: 0,
      coverUrl: coverUrl,
      registrationStartDate: this.formatDate(item.InInscripcion),
      registrationEndDate: this.formatDate(item.FnInscripcion),
      courseStartDate: this.formatDate(item.InCurso),
      courseEndDate: this.formatDate(item.FnCurso),
    };
  }

  loadEvents(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.isLoading.set(true);
    // Clear previous database events to prevent duplicate/lingering elements during loading
    this.events.update(list => list.filter(e => e.type === 'Repositorio'));

    this.apiService.get<any[]>('/eventos').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          const mapped = data.map(item => this.mapBackendEventoToEventItem(item));
          
          const bannerRequests = mapped.map(event => {
            if (event.id && event.coverUrl) {
              return this.apiService.get<{ base64: string }>(`/eventos/${event.id}/banner-base64`).pipe(
                catchError(() => of({ base64: '' })),
                map(res => {
                  if (res && res.base64) {
                    event.coverUrl = res.base64;
                  }
                  return event;
                })
              );
            }
            return of(event);
          });

          if (bannerRequests.length > 0) {
            forkJoin(bannerRequests).subscribe({
              next: (updatedEvents) => {
                const staticRepositorios = this.events().filter(e => e.type === 'Repositorio');
                this.events.set([...updatedEvents, ...staticRepositorios]);
                this.isLoading.set(false);
              },
              error: (err) => {
                console.error('Error loading banners:', err);
                const staticRepositorios = this.events().filter(e => e.type === 'Repositorio');
                this.events.set([...mapped, ...staticRepositorios]);
                this.isLoading.set(false);
              }
            });
          } else {
            const staticRepositorios = this.events().filter(e => e.type === 'Repositorio');
            this.events.set([...mapped, ...staticRepositorios]);
            this.isLoading.set(false);
          }
        } else {
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error fetching events from backend:', err);
        this.isLoading.set(false);
      }
    });
  }

  loadActivityTypes(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.apiService.get<any[]>('/tipo-actividades').subscribe({
      next: (data) => {
        if (Array.isArray(data) && data.length > 0) {
          this.activityTypes.set(data);
        }
      },
      error: (err) => {
        console.error('Error fetching activity types from backend:', err);
      }
    });
  }

  // --- ESTADO GLOBAL DE CARGA Y ERROR ---
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string>('');

  // --- MOCK STORES USING SIGNALS ---

  // 1. Events Store
  readonly events = signal<EventItem[]>([
    {
      id: 1,
      title: 'Desarrollo Frontend con Angular Avanzado',
      type: 'Curso',
      date: '2026-06-15',
      description: 'Domina Angular Signals, Server-Side Rendering (SSR), standalone architecture y optimizaciones.',
      fullDescription: 'Este curso avanzado te llevará a través de los conceptos de diseño modernos introducidos en las últimas versiones de Angular. Aprenderás sobre reactividad reactiva con Signals, la migración de aplicaciones tradicionales, Hydration con SSR, y optimización de bundle sizes para producción.',
      imageGradient: 'from-rose-600 via-pink-600 to-red-700',
      icon: '🅰️',
      status: 'activo',
      hours: 40,
      instructor: 'Dr. Alejandro Benítez',
      capacity: 35,
      registeredCount: 12,
    },
    {
      id: 2,
      title: 'Diseño de Interfaces Web Premium y UX/UI',
      type: 'Taller',
      date: '2026-06-22',
      description: 'Crea experiencias inmersivas aplicando glassmorphism, esquemas HSL sofisticados y micro-animaciones.',
      fullDescription: 'El taller está enfocado en la excelencia visual y técnica de las interfaces de usuario. Aprenderás a diseñar layouts espectaculares y cómo traducirlos a código con Tailwind y CSS moderno, optimizando las transiciones y micro-interacciones.',
      imageGradient: 'from-amber-500 via-orange-600 to-red-600',
      icon: '🎨',
      status: 'activo',
      hours: 20,
      instructor: 'MSc. Elena Rostova',
      capacity: 25,
      registeredCount: 8,
    },

    {
      id: 4,
      title: 'Seminario de Seguridad y Criptografía Aplicada',
      type: 'Seminario',
      date: '2026-06-02',
      description: 'Análisis de protocolos modernos de seguridad, blockchain y firmas criptográficas en entornos corporativos.',
      fullDescription: 'Un seminario técnico para profundizar en firmas digitales, encriptación asimétrica y la infraestructura de clave pública (PKI) utilizada en sistemas de autenticación y emisión de credenciales seguras.',
      imageGradient: 'from-[#be123c] via-rose-700 to-amber-600',
      icon: '🔐',
      status: 'activo',
      hours: 15,
      instructor: 'Ing. Carlos Mendoza',
      capacity: 50,
      registeredCount: 22,
    },
    // --- Past Events ---
    {
      id: 5,
      title: 'Fundamentos de Algoritmia y Estructuras de Datos',
      type: 'Curso',
      date: '2026-04-10',
      description: 'Análisis de complejidad, estructuras avanzadas (árboles, grafos) y resolución de problemas algorítmicos.',
      fullDescription: 'Curso fundamental completado exitosamente en el periodo anterior. Diseñado para fortalecer las bases de pensamiento algorítmico y análisis de Big O notation en problemas del mundo real.',
      imageGradient: 'from-slate-700 via-slate-800 to-slate-950',
      icon: '💻',
      status: 'pasado',
      hours: 48,
      instructor: 'Dra. Patricia Sotomayor',
      capacity: 40,
      registeredCount: 40,
    },
    {
      id: 6,
      title: 'Taller de Introducción a Docker y GitOps',
      type: 'Taller',
      date: '2026-03-18',
      description: 'Configuración de contenedores locales, pipelines de CI/CD y despliegue automatizado con prácticas GitOps.',
      fullDescription: 'Sesiones de laboratorio práctico enfocadas en Dockerización de aplicaciones Web e implementación de integración continua de software para entornos tecnológicos.',
      imageGradient: 'from-slate-700 via-slate-800 to-slate-950',
      icon: '🐳',
      status: 'pasado',
      hours: 16,
      instructor: 'Ing. Gustavo Alarcón',
      capacity: 30,
      registeredCount: 30,
    },
    {
      id: 7,
      title: 'Perfil bacteriano y susceptibilidad antimicrobiana de pacientes ambulatorios que acuden al Hospital Carlos Monge Medrano – Juliaca durante julio – septiembre 2023',
      type: 'Repositorio',
      date: '2023-09-15',
      description: 'Las infecciones del tracto urinario (ITU) son comunes en la población general y representan un problema de salud, se manifiesta de forma sintomática como asintomática. Esta investigación fue realizada en el área de microbiología del Hospital Carlos Monge Medrano de Juliaca entre julio - septiembre del 2023, tuvo como objetivo identificar el perfil bacteriano y la susceptibilidad antimicrobiana...',
      fullDescription: 'Investigación académica que realiza un mapeo epidemiológico del perfil bacteriano y la resistencia a los antibióticos en la zona sur para establecer estrategias preventivas sólidas en salud pública.',
      imageGradient: 'from-wine-800 to-rose-600',
      icon: '📚',
      status: 'activo',
      hours: 0,
      instructor: 'Asesor: Dr. Alejandro Benítez',
      capacity: 0,
      registeredCount: 0,
      authors: 'Colquehuanca Baldarrago, Kely Gabriela; Pauro Roque, Juan José',
      docType: 'Thesis',
      coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: 8,
      title: 'Implementación de un Sistema de Monitoreo Agrícola Automatizado con IoT para Cultivos en la Región de Chojata',
      type: 'Repositorio',
      date: '2025-03-12',
      description: 'Proyecto de investigación aplicada enfocado en el diseño e implementación de una red de sensores IoT (humedad, temperatura, radiación) de bajo costo para optimizar el riego de cultivos de alfalfa y frutales en la sierra de Moquegua, en colaboración con el área de tecnologías.',
      fullDescription: 'Desarrollo de hardware y software empotrado utilizando microcontroladores y sensores calibrados para optimizar el recurso hídrico en la comunidad agrícola de Chojata, Moquegua.',
      imageGradient: 'from-amber-600 via-rose-700 to-amber-600',
      icon: '🌱',
      status: 'activo',
      hours: 0,
      instructor: 'Asesor: Ing. Francisco Carranza',
      capacity: 0,
      registeredCount: 0,
      authors: 'Choque Quispe, Juan; Mamani Flores, Wilber',
      docType: 'Proyecto'
    },
    {
      id: 9,
      title: 'Análisis Comparativo del Impacto de la Ley de Institutos N.° 30512 en el Emprendimiento Tecnológico en Moquegua',
      type: 'Repositorio',
      date: '2026-05-18',
      description: 'Artículo de investigación que evalúa las oportunidades de inserción laboral, transferencia tecnológica y emprendimiento que brinda el nuevo marco regulatorio de institutos de educación superior técnica en el sur del Perú.',
      fullDescription: 'Un estudio de políticas públicas que analiza cómo la Ley 30512 incentiva la innovación y la creación de incubadoras tecnológicas dentro de los institutos públicos de Moquegua.',
      imageGradient: 'from-wine-800 to-amber-600',
      icon: '📄',
      status: 'activo',
      hours: 0,
      instructor: 'Asesor: Dra. Clara Valdivia',
      capacity: 0,
      registeredCount: 0,
      authors: 'Valdivia Ruiz, Clara; Flores Pinto, Alejandro',
      docType: 'Artículo'
    },
    {
      id: 10,
      title: 'Optimización de Procesos de Selección de Personal en Pymes de la Provincia de Sánchez Cerro mediante Algoritmos Genéticos',
      type: 'Repositorio',
      date: '2024-10-05',
      description: 'Esta investigación propone un modelo inteligente para automatizar y filtrar perfiles profesionales según competencias clave utilizando algoritmos bio-inspirados. Los resultados demuestran una reducción sustancial de los tiempos de contratación y una mejora en la afinidad del candidato.',
      fullDescription: 'Tesis de grado enfocada en inteligencia artificial aplicada a la gestión de talento humano en el sector empresarial local.',
      imageGradient: 'from-amber-600 to-rose-700',
      icon: '🧠',
      status: 'activo',
      hours: 0,
      instructor: 'Asesor: Ing. Gustavo Alarcón',
      capacity: 0,
      registeredCount: 0,
      authors: 'Cárdenas Medina, Sofía; Peralta Vega, Luis',
      docType: 'Thesis'
    },
  ]);

  // 2. Users Store
  readonly users = signal<UserItem[]>([
    {
      email: 'admin@institucion.edu',
      name: 'Director General Ing. Francisco Carranza',
      role: 'Administrador',
      dni: '00000001',
      password: 'admin123',
    },
    {
      email: 'caja@institucion.edu',
      name: 'Lic. Sofía Alva (Tesorera)',
      role: 'Caja',
      dni: '00000002',
      password: 'caja123',
    },
    {
      email: 'formacion@institucion.edu',
      name: 'Unidad de Formación Continua',
      role: 'Formación Continua',
      dni: '00000003',
      password: 'formacion123',
    },
    {
      email: 'investigacion@institucion.edu',
      name: 'Unidad de Investigación',
      role: 'Investigación',
      dni: '00000004',
      password: 'investigacion123',
    },
  ]);

  // 3. Registrations Store
  readonly registrations = signal<Registration[]>([
    {
      id: 1,
      userEmail: 'participante@institucion.edu',
      userName: 'Estudiante Juan Choque Vega',
      userDni: '73549281',
      eventId: 1,
      eventTitle: 'Desarrollo Frontend con Angular Avanzado',
      date: '2026-05-10',
      status: 'Aprobado',
      // Preloaded with a validated payment
      isPaymentValidated: true,
      receiptNumber: 'REC-2026-0091',
      receiptDate: '2026-05-10',
      receiptAmount: 150.00,
      receiptImage: 'https://images.unsplash.com/photo-1554416278-ca5e3f4abd8c?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 2,
      userEmail: 'participante@institucion.edu',
      userName: 'Estudiante Juan Choque Vega',
      userDni: '73549281',
      eventId: 2,
      eventTitle: 'Diseño de Interfaces Web Premium y UX/UI',
      date: '2026-05-11',
      status: 'Pendiente',
    },
    {
      id: 3,
      userEmail: 'maria.lopez@institucion.edu',
      userName: 'María López Gutiérrez',
      userDni: '44556677',
      eventId: 1,
      eventTitle: 'Desarrollo Frontend con Angular Avanzado',
      date: '2026-05-15',
      status: 'Aprobado',
      // Approved but payment has not been validated
      isPaymentValidated: false,
    },
    {
      id: 4,
      userEmail: 'maria.lopez@institucion.edu',
      userName: 'María López Gutiérrez',
      userDni: '44556677',
      eventId: 2,
      eventTitle: 'Diseño de Interfaces Web Premium y UX/UI',
      date: '2026-05-16',
      status: 'Pendiente',
    },
  ]);

  // 4. Certificates Store
  readonly certificates = signal<Certificate[]>([
    {
      code: 'CERT-2026-001',
      fullName: 'Estudiante Juan Choque Vega',
      dni: '73549281',
      eventId: 5,
      eventTitle: 'Fundamentos de Algoritmia y Estructuras de Datos',
      issueDate: '2026-04-12',
      status: 'Válido',
      hours: 48,
      signatureName: 'Dra. Patricia Sotomayor',
      signatureRole: 'Docente del Curso',
    },
    {
      code: 'CERT-2026-002',
      fullName: 'María López Gutiérrez',
      dni: '44556677',
      eventId: 5,
      eventTitle: 'Fundamentos de Algoritmia y Estructuras de Datos',
      issueDate: '2026-04-12',
      status: 'Válido',
      hours: 48,
      signatureName: 'Dra. Patricia Sotomayor',
      signatureRole: 'Docente del Curso',
    },
    {
      code: 'CERT-2026-003',
      fullName: 'Estudiante Juan Choque Vega',
      dni: '73549281',
      eventId: 6,
      eventTitle: 'Taller de Introducción a Docker y GitOps',
      issueDate: '2026-03-20',
      status: 'Válido',
      hours: 16,
      signatureName: 'Ing. Gustavo Alarcón',
      signatureRole: 'Tutor a Cargo',
    },
  ]);

  // 5. Attendance Records Store
  readonly attendances = signal<AttendanceRecord[]>([
    {
      eventId: 1,
      sessionDate: '2026-06-15',
      records: {
        'participante@institucion.edu': true,
        'maria.lopez@institucion.edu': true,
      },
    },
    {
      eventId: 1,
      sessionDate: '2026-06-16',
      records: {
        'participante@institucion.edu': true,
        'maria.lopez@institucion.edu': false,
      },
    },
    {
      eventId: 5,
      sessionDate: '2026-04-10',
      records: {
        'participante@institucion.edu': true,
        'maria.lopez@institucion.edu': true,
      },
    },
  ]);

  // --- SESSION STATE ---
  readonly currentUser = signal<UserItem | null>(
    isPlatformBrowser(inject(PLATFORM_ID)) && localStorage.getItem('auth_user')
      ? JSON.parse(localStorage.getItem('auth_user')!)
      : null
  );
  readonly isLoggedIn = computed(() => this.currentUser() !== null);
  readonly userRole = computed(() => this.currentUser()?.role || null);

  // --- METHODS ---

  // Authentication — delega al ApiService (llama al backend real)
  login(email: string, password: string): Observable<boolean> {
    this.isLoading.set(true);
    this.errorMessage.set('');

    return new Observable<boolean>((observer) => {
      this.apiService.login(email, password).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (res.status === 'success' && res.user && res.token) {
            const user: UserItem = {
              email: res.user.email,
              name: res.user.name,
              role: res.user.role as UserItem['role'],
              dni: res.user.dni,
            };
            this.currentUser.set(user);
            if (isPlatformBrowser(this.platformId)) {
              localStorage.setItem('auth_token', res.token);
              localStorage.setItem('auth_user', JSON.stringify(user));
            }
            if (user.role === 'Administrador') {
              this.loadUsers();
            }
            observer.next(true);
          } else {
            this.errorMessage.set(res.message ?? 'Credenciales incorrectas.');
            observer.next(false);
          }
          observer.complete();
        },
        error: (err: Error) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message ?? 'Error al conectar con el servidor.');
          observer.next(false);
          observer.complete();
        },
      });
    });
  }

  logout(): void {
    this.currentUser.set(null);
    this.errorMessage.set('');
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    }
  }

  // Registration Flow
  registerToEvent(userDni: string, userName: string, userEmail: string, eventId: any): { success: boolean; message: string } {
    const event = this.events().find((e) => e.id === eventId);
    if (!event) return { success: false, message: 'Evento no encontrado.' };

    if (event.status === 'pasado') {
      return { success: false, message: 'El evento ya ha concluido.' };
    }

    if (event.registeredCount >= event.capacity) {
      return { success: false, message: 'Se ha agotado el cupo del evento.' };
    }

    // Check if already registered
    const alreadyRegistered = this.registrations().some(
      (r) => r.userDni === userDni && r.eventId === eventId
    );
    if (alreadyRegistered) {
      return { success: false, message: 'Ya se encuentra registrado en este evento.' };
    }

    // Check if user is not in database, add them as a mock Caja user
    const userExists = this.users().some((u) => u.dni === userDni || u.email === userEmail);
    if (!userExists) {
      const newUser: UserItem = {
        email: userEmail,
        name: userName,
        role: 'Caja',
        dni: userDni,
        password: 'caja' + userDni.slice(-4), // default password
      };
      this.users.update((curr) => [...curr, newUser]);
    }

    // Create registration
    const newRegId = this.registrations().length > 0 ? Math.max(...this.registrations().map(r => r.id)) + 1 : 1;
    const newRegistration: Registration = {
      id: newRegId,
      userEmail: userEmail,
      userName: userName,
      userDni: userDni,
      eventId: eventId,
      eventTitle: event.title,
      date: new Date().toISOString().split('T')[0],
      status: 'Pendiente', // starts as pending approval
    };

    this.registrations.update((curr) => [...curr, newRegistration]);
    
    // Update event registered count
    this.events.update((list) =>
      list.map((e) => (e.id === eventId ? { ...e, registeredCount: e.registeredCount + 1 } : e))
    );

    return { success: true, message: 'Inscripción registrada correctamente. Pendiente de aprobación.' };
  }

  // Manage Registrations (Admin / Coordinator)
  updateRegistrationStatus(regId: number, status: 'Aprobado' | 'Rechazado'): void {
    this.registrations.update((list) =>
      list.map((r) => (r.id === regId ? { ...r, status } : r))
    );
  }

  // Payment Validation & Approval Method
  validatePaymentAndApprove(
    regId: number,
    receiptNumber: string,
    receiptDate: string,
    receiptAmount: number,
    receiptImage: string
  ): void {
    this.registrations.update((list) =>
      list.map((r) =>
        r.id === regId
          ? {
              ...r,
              status: 'Aprobado',
              isPaymentValidated: true,
              receiptNumber,
              receiptDate,
              receiptAmount,
              receiptImage,
            }
          : r
      )
    );
  }

  // Add / Edit / Delete Events (Admin / Coordinator)
  addEvent(event: EventItem): void {
    this.events.update((curr) => [event, ...curr]);
  }

  editEvent(updated: EventItem): void {
    this.events.update((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  }

  deleteEvent(id: any): void {
    this.events.update((list) => list.filter((e) => e.id !== id));
    // also remove registrations for this event
    this.registrations.update((list) => list.filter((r) => r.eventId !== id));
  }

  loadUsers(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isLoggedIn() || this.userRole() !== 'Administrador') {
      return;
    }
    this.apiService.get<UserItem[]>('/users').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          this.users.set(data);
        }
      },
      error: (err) => {
        console.error('Error fetching users:', err);
      }
    });
  }

  // Add / Edit / Delete Users (Admin / Coordinator)
  addUser(user: UserItem): void {
    this.apiService.post<any>('/users', user).subscribe({
      next: (resp) => {
        this.loadUsers();
      },
      error: (err) => {
        console.error('Error al agregar usuario:', err);
        alert('❌ Error al registrar el usuario en la base de datos: ' + (err?.error?.message || 'Error de red o duplicado.'));
      }
    });
  }

  editUser(updated: UserItem, originalEmail: string): void {
    this.apiService.put<any>(`/users/${originalEmail}`, updated).subscribe({
      next: (resp) => {
        this.loadUsers();
        alert('✅ Usuario actualizado correctamente.');
      },
      error: (err) => {
        console.error('Error al editar usuario:', err);
        alert('❌ Error al actualizar el usuario: ' + (err?.error?.message || 'Error del servidor.'));
      }
    });
  }

  deleteUser(email: string): void {
    this.apiService.delete<any>(`/users/${email}`).subscribe({
      next: (resp) => {
        this.loadUsers();
        alert('✅ Usuario eliminado correctamente.');
      },
      error: (err) => {
        console.error('Error al eliminar usuario:', err);
        alert('❌ Error al eliminar el usuario: ' + (err?.error?.message || 'Error del servidor.'));
      }
    });
  }

  // Attendance Check-in
  checkAttendance(eventId: any, sessionDate: string, email: string, attended: boolean): void {
    this.attendances.update((list) => {
      const idx = list.findIndex((a) => a.eventId === eventId && a.sessionDate === sessionDate);
      if (idx !== -1) {
        const updated = { ...list[idx] };
        updated.records = { ...updated.records, [email]: attended };
        const copy = [...list];
        copy[idx] = updated;
        return copy;
      } else {
        const newRecord: AttendanceRecord = {
          eventId,
          sessionDate,
          records: { [email]: attended },
        };
        return [...list, newRecord];
      }
    });
  }

  // Certificate Automatic / Manual Emission
  emitCertificate(dni: string, eventId: any): { success: boolean; message: string; code?: string } {
    const user = this.users().find((u) => u.dni === dni);
    const event = this.events().find((e) => e.id === eventId);
    
    if (!user || !event) {
      return { success: false, message: 'Usuario o evento no válido.' };
    }

    // Check if already exists
    const exists = this.certificates().find((c) => c.dni === dni && c.eventId === eventId);
    if (exists) {
      return { success: false, message: 'Este participante ya cuenta con un certificado para este evento.', code: exists.code };
    }

    const year = new Date().getFullYear();
    const count = this.certificates().length + 1;
    const certCode = `CERT-${year}-${String(count).padStart(3, '0')}`;

    const newCert: Certificate = {
      code: certCode,
      fullName: user.name,
      dni: user.dni,
      eventId: event.id,
      eventTitle: event.title,
      issueDate: new Date().toISOString().split('T')[0],
      status: 'Válido',
      hours: event.hours,
      signatureName: event.instructor || 'Director General del IESTP Chojata',
      signatureRole: event.instructor ? 'Docente del Curso' : 'Autoridad del Instituto',
    };

    this.certificates.update((curr) => [...curr, newCert]);
    return { success: true, message: 'Certificado emitido con éxito.', code: certCode };
  }

  // Revoke/Revalidate Certificate (Admin)
  toggleCertificateStatus(code: string): void {
    this.certificates.update((list) =>
      list.map((c) =>
        c.code === code ? { ...c, status: c.status === 'Válido' ? 'Revocado' : 'Válido' } : c
      )
    );
  }

  // Public/Private search tools
  findCertificateByCode(code: string): Certificate | undefined {
    return this.certificates().find((c) => c.code.trim().toUpperCase() === code.trim().toUpperCase());
  }

  findCertificatesByDni(dni: string): Certificate[] {
    return this.certificates().filter((c) => c.dni.trim() === dni.trim());
  }

  // Advanced Excel CSV Mock Export
  exportToCsv(filename: string, headers: string[], data: any[][]): void {
    let csvContent = '\uFEFF'; // Add BOM for Excel UTF-8 display
    csvContent += headers.join(';') + '\n';
    
    data.forEach((row) => {
      const cleanRow = row.map((cell) => {
        const strVal = String(cell ?? '');
        return '"' + strVal.replace(/"/g, '""') + '"';
      });
      csvContent += cleanRow.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename + '_' + new Date().toISOString().split('T')[0] + '.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
