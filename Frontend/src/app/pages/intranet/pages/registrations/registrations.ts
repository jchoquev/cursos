import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, Registration } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { DnaLoaderComponent } from '../../../../components/dna-loader/dna-loader';
import { IntranetPaymentService } from '../../../../services/intranet-payment.service';
import { AlertService } from '../../../../services/alert.service';
import { ModalComponent } from '../../../../components/modal/modal.component';
import { PaginationComponent } from '../../../../components/pagination/pagination.component';

// Registrations component managing manually added and pending registrations
@Component({
  selector: 'app-registrations',
  standalone: true,
  imports: [CommonModule, FormsModule, DnaLoaderComponent, ModalComponent, PaginationComponent],
  templateUrl: './registrations.html',
})
export class RegistrationsComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  readonly dnaLoader = inject(DnaLoaderService);
  private readonly paymentService = inject(IntranetPaymentService);
  private readonly alert = inject(AlertService);

  searchingDniReg = signal<boolean>(false);
  dniFoundInDB = signal<boolean | null>(null);

  showRegistrationModal = signal<boolean>(false);
  savingRegistration = signal<boolean>(false);
  saveRegistrationError = signal<string>('');

  registrationForm = signal<{
    userDni: string; userName: string; userPaternalLastName: string; userMaternalLastName: string;
    userEmail: string; userPhone: string; userGrado: string; userProcedencia: string;
    userTipoAsistente: number; eventId: any;
  }>({
    userDni: '', userName: '', userPaternalLastName: '', userMaternalLastName: '',
    userEmail: '', userPhone: '', userGrado: '', userProcedencia: 'Interno',
    userTipoAsistente: 1, eventId: null,
  });

  academicPeriods = signal<any[]>([]);
  selectedPeriodId = signal<string>('');
  filteredEventsForModal = signal<any[]>([]);

  tempFilterPeriodId = signal<string>('');
  tempFilterEventId = signal<string>('');
  tempRegSearchQuery = signal<string>('');
  activeFilterPeriodId = signal<string>('');
  activeFilterEventId = signal<string>('');
  activeRegSearchQuery = signal<string>('');
  regSortColumn = signal<string>('date');
  regSortDirection = signal<'asc' | 'desc'>('desc');
  regCurrentPage = signal<number>(1);
  regPageSize = signal<number>(5);

  readonly availableEventsForSelectedPeriod = computed(() => {
    const periodId = this.tempFilterPeriodId();
    const events = this.platformService.events().filter(e => e.type !== 'Repositorio');
    if (!periodId) return events;
    return events.filter(e => e.Id_PeriodoAca === periodId);
  });

  readonly filteredAndPaginatedRegistrations = computed(() => {
    const periodId = this.activeFilterPeriodId();
    const eventId = this.activeFilterEventId();
    const query = this.activeRegSearchQuery().toLowerCase().trim();
    const sortCol = this.regSortColumn();
    const sortDir = this.regSortDirection();
    const page = this.regCurrentPage();
    const size = this.regPageSize();
    let list = [...this.platformService.registrations()];

    if (periodId) {
      const periodEventIds = new Set(
        this.platformService.events()
          .filter(e => e.Id_PeriodoAca === periodId)
          .map(e => String(e.id))
      );
      list = list.filter(r => periodEventIds.has(String(r.eventId)));
    }
    if (eventId) list = list.filter(r => String(r.eventId) === String(eventId));
    if (query) list = list.filter(r =>
      r.userName?.toLowerCase().includes(query) || r.userDni?.includes(query) || r.userEmail?.toLowerCase().includes(query)
    );
    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || ''; const valB = b[sortCol] || '';
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    const start = (page - 1) * size;
    return { items: list.slice(start, start + size), totalItems: list.length, totalPages: Math.ceil(list.length / size) || 1 };
  });

  applyRegistrationFilters(): void {
    this.activeFilterPeriodId.set(this.tempFilterPeriodId());
    this.activeFilterEventId.set(this.tempFilterEventId());
    this.activeRegSearchQuery.set(this.tempRegSearchQuery());
    this.regCurrentPage.set(1);
  }

  changeRegSort(column: string): void {
    if (this.regSortColumn() === column) { this.regSortDirection.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.regSortColumn.set(column); this.regSortDirection.set('asc'); }
    this.regCurrentPage.set(1);
  }

  getParticipantType(registration: Registration): string {
    const type = (registration.tipoAsistente || 'PARTICIPANTE').trim().toUpperCase();
    return type === 'ASISTENTE' ? 'PARTICIPANTE' : type;
  }

  ngOnInit(): void {
    this.platformService.loadRegistrations();
    this.platformService.loadEvents();
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.apiService.get<any[]>('/periodo-aca').subscribe({
      next: (periods) => {
        if (Array.isArray(periods)) {
          // Sort periods descending by Asig (e.g. 2026-I, 2025-II, 2025-I)
          periods.sort((a, b) => b.Asig.localeCompare(a.Asig, undefined, { numeric: true, sensitivity: 'base' }));
          this.academicPeriods.set(periods);
        }
      }
    });
  }

  private loadEventsForModal(periodId: string): void {
    if (!periodId) {
      this.filteredEventsForModal.set([]);
      return;
    }

    const params = { periodo_id: periodId, solo_activos: '1' };
    this.apiService.get<any[]>('/eventos', params).subscribe({
      next: (events) => {
        if (Array.isArray(events)) {
          const mapped = events
            .map(item => this.platformService.mapBackendEventoToEventItem(item))
            .filter(ev => ev.type !== 'Repositorio' && ev.status === 'activo');
          this.filteredEventsForModal.set(mapped);
        } else {
          this.filteredEventsForModal.set([]);
        }
      },
      error: () => this.filteredEventsForModal.set([])
    });
  }

  onPeriodChange(periodId: string): void {
    this.selectedPeriodId.set(periodId);
    this.registrationForm.update(f => ({ ...f, eventId: null }));
    this.loadEventsForModal(periodId);
  }

  openAddRegistration(): void {
    this.saveRegistrationError.set(''); this.savingRegistration.set(false);
    this.searchingDniReg.set(false); this.dniFoundInDB.set(null);
    this.registrationForm.set({
      userDni: '', userName: '', userPaternalLastName: '', userMaternalLastName: '',
      userEmail: '', userPhone: '', userGrado: '', userProcedencia: 'Interno',
      userTipoAsistente: 1, eventId: null,
    });

    this.selectedPeriodId.set('');
    this.filteredEventsForModal.set([]);

    this.showRegistrationModal.set(true);
  }

  onRegDniChange(dni: string): void {
    this.registrationForm.update(f => ({ ...f, userDni: dni }));
    this.dniFoundInDB.set(null);
    if (dni.trim().length !== 8) return;
    this.searchingDniReg.set(true);
    this.dnaLoader.show('Consultando Base de Datos', 'Buscando informacion del participante...');
    this.apiService.get<any>('/consulta-dni/' + dni.trim()).subscribe({
      next: (res: any) => {
        this.searchingDniReg.set(false);
        this.dnaLoader.hide();
        const data = res?.data || res;
        if (data && data.DNI) {
          this.dniFoundInDB.set(true);
          this.registrationForm.update(f => ({
            ...f,
            userName: data.Nombres || '',
            userPaternalLastName: data.ApPaterno || '',
            userMaternalLastName: data.ApMaterno || '',
            userEmail: data.Correo || '',
            userPhone: data.NumCelular || '',
            userGrado: data.Grado || '',
          }));
        } else {
          this.dniFoundInDB.set(false);
        }
      },
      error: () => {
        this.searchingDniReg.set(false);
        this.dnaLoader.hide();
        this.dniFoundInDB.set(false);
      }
    });
  }

  saveRegistration(): void {
    const form = this.registrationForm();
    if (!form.userDni || !form.userName || !form.userPaternalLastName || !form.userMaternalLastName || !form.userEmail || !form.userPhone || !form.eventId) {
      this.saveRegistrationError.set('Por favor complete todos los campos obligatorios.'); return;
    }
    this.savingRegistration.set(true); this.saveRegistrationError.set('');
    const payload = {
      DNI: form.userDni, Nombres: form.userName, ApPaterno: form.userPaternalLastName,
      ApMaterno: form.userMaternalLastName, Correo: form.userEmail, NumCelular: form.userPhone,
      GradAcademico: form.userGrado, Procedencia: form.userProcedencia, TipoAsistente: form.userTipoAsistente,
      evento_id: form.eventId,
    };
    this.apiService.post<any>('/matriculas', payload).subscribe({
      next: () => {
        this.savingRegistration.set(false); this.showRegistrationModal.set(false);
        this.platformService.loadRegistrations(true);
        this.alert.success('Inscripción registrada y correo enviado al participante.');
      },
      error: (err) => {
        this.savingRegistration.set(false);
        this.saveRegistrationError.set(err?.error?.message || 'Error al guardar la inscripción.');
      }
    });
  }

  rejectReg(id: any): void {
    this.alert.confirmDanger('¿Rechazar y eliminar esta solicitud de inscripción?', undefined, 'Eliminar').then(ok => {
      if (!ok) return;
      this.apiService.delete<any>('/matriculas/' + id).subscribe({
        next: () => { this.platformService.loadRegistrations(true); this.alert.success('Inscripción eliminada correctamente.'); },
        error: () => { this.alert.error('Error al eliminar la inscripción.'); }
      });
    });
  }

  openValidatePayment(registration: Registration): void {
    this.paymentService.open(registration);
  }

  printRegistrations(): void {
    window.print();
  }
}
