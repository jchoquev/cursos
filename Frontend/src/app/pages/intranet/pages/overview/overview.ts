import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { PlatformService } from '../../../../services/platform.service';

interface ChartItem { label: string; value: number; }

interface DashboardStats {
  role: string;
  period: { id: string; name: string } | null;
  summary: {
    users: number; events: number; active_events: number; registrations: number;
    pending_payments: number; validated_payments: number; revenue: number; certificates: number;
    projects: number; published_projects: number; hidden_projects: number;
    projects_in_progress: number; completed_projects: number;
  };
  charts: { event_types: ChartItem[]; project_states: ChartItem[]; payment_states: ChartItem[] };
  recent: {
    registrations: { id: number; name: string; event: string; type: string; paid: boolean; date: string }[];
    projects: { id: string; title: string; state: string; published: boolean; period: string }[];
  };
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
  readonly dashboard = signal<DashboardStats | null>(null);
  readonly isLoading = signal(true);
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

  ngOnInit(): void {
    this.loadDashboardStats();
  }

  loadDashboardStats(): void {
    this.isLoading.set(true);
    this.apiService.get<DashboardStats>('/dashboard/stats').subscribe({
      next: stats => { this.dashboard.set(stats); this.isLoading.set(false); },
      error: error => {
        console.error('Error cargando estadísticas del dashboard:', error);
        this.isLoading.set(false);
      },
    });
  }

  chartWidth(value: number, items: ChartItem[]): string {
    const max = Math.max(...items.map(item => item.value), 1);
    return `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%`;
  }

  participantType(type: string): string {
    return type.toUpperCase() === 'ASISTENTE' ? 'PARTICIPANTE' : type;
  }
}
