import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { PlatformService } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';

interface ProjectSummary {
  Id: string;
  Titulo: string;
  Estado: string;
  Inicio: string;
  Fin?: string | null;
  hidden: boolean;
  periodo_aca?: { Asig?: string };
  linea?: { Linea?: string };
}

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.html',
})
export class OverviewComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);

  readonly projects = signal<ProjectSummary[]>([]);

  readonly role = this.platformService.userRole;
  readonly roleTitle = computed(() => {
    switch (this.role()) {
      case 'Administrador': return 'Resumen institucional';
      case 'Caja': return 'Resumen de pagos e inscripciones';
      case 'Formación Continua': return 'Resumen de Formación Continua';
      case 'Investigación': return 'Resumen de Investigación';
      default: return 'Resumen general';
    }
  });

  readonly nonRepositoryEvents = computed(() =>
    this.platformService.events().filter(event => event.type !== 'Repositorio')
  );

  readonly registrations = computed(() => this.platformService.registrations());

  readonly adminStats = computed(() => {
    const registrations = this.registrations();
    const events = this.nonRepositoryEvents();
    const projects = this.projects();
    return {
      users: this.platformService.users().length,
      events: events.length,
      activeEvents: events.filter(event => event.status === 'activo').length,
      registrations: registrations.length,
      pendingPayments: registrations.filter(registration => !registration.isPaymentValidated).length,
      issuedCertificates: registrations.filter(registration => registration.documentIssued).length,
      projects: projects.length,
      publishedProjects: projects.filter(project => !project.hidden).length,
    };
  });

  readonly cashStats = computed(() => {
    const registrations = this.registrations();
    const validated = registrations.filter(registration => registration.isPaymentValidated);
    return {
      total: registrations.length,
      pending: registrations.filter(registration => !registration.isPaymentValidated).length,
      validated: validated.length,
      collected: validated.reduce((total, registration) => total + (registration.receiptAmount || 0), 0),
    };
  });

  readonly formationStats = computed(() => {
    const events = this.nonRepositoryEvents();
    const registrations = this.registrations();
    return {
      totalEvents: events.length,
      activeEvents: events.filter(event => event.status === 'activo').length,
      pastEvents: events.filter(event => event.status === 'pasado').length,
      registrations: registrations.length,
      certificates: registrations.filter(registration => registration.documentIssued).length,
    };
  });

  readonly researchStats = computed(() => {
    const projects = this.projects();
    return {
      total: projects.length,
      published: projects.filter(project => !project.hidden).length,
      hidden: projects.filter(project => project.hidden).length,
      inProgress: projects.filter(project => ['En Ejecución', 'En Proceso'].includes(project.Estado)).length,
      completed: projects.filter(project => project.Estado === 'Concluido').length,
    };
  });

  readonly eventTypeSummary = computed(() => {
    const events = this.nonRepositoryEvents();
    return ['Curso', 'Taller', 'Seminario'].map(type => ({
      type,
      total: events.filter(event => event.type === type).length,
      active: events.filter(event => event.type === type && event.status === 'activo').length,
    }));
  });

  readonly recentRegistrations = computed(() => this.registrations().slice(0, 6));
  readonly recentProjects = computed(() => this.projects().slice(0, 6));

  ngOnInit(): void {
    this.platformService.loadEvents();
    this.platformService.loadRegistrations();

    if (this.role() === 'Administrador' || this.role() === 'Investigación') {
      this.loadProjects();
    }
  }

  private loadProjects(): void {
    this.apiService.get<any>('/proyectos', { per_page: 999 }).pipe(
      catchError(error => {
        console.error('Error cargando proyectos para el resumen:', error);
        return of({ data: [] });
      })
    ).subscribe(response => {
      const data = Array.isArray(response) ? response : response?.data;
      this.projects.set(Array.isArray(data) ? data : []);
    });
  }
}
