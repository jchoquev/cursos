import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AlertService } from '../../../../services/alert.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { ModalComponent } from '../../../../components/modal/modal.component';
import { PaginationComponent } from '../../../../components/pagination/pagination.component';

export interface PeriodoAca { Id: string; Asig: string; Activo: boolean; }

export interface InvLinea {
  Id: string;
  Id_PeriodoAca: string;
  Linea: string;
  periodo_aca?: PeriodoAca;
}

@Component({
  selector: 'app-inv-lineas',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  templateUrl: './inv-lineas.html',
})
export class InvLineasComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly alert = inject(AlertService);
  private readonly dnaLoader = inject(DnaLoaderService);

  lineas = signal<InvLinea[]>([]);
  periodos = signal<PeriodoAca[]>([]);
  isLoading = signal<boolean>(false);
  loadError = signal<string>('');

  // Paginación + búsqueda
  total = signal<number>(0);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  lastPage = signal<number>(1);
  tempSearch = signal<string>('');
  searchQuery = signal<string>('');
  filterPeriodoId = signal<string>('');

  // Modal
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  saving = signal<boolean>(false);
  saveError = signal<string>('');
  form = signal<{ Id: string; Id_PeriodoAca: string; Linea: string }>({ Id: '', Id_PeriodoAca: '', Linea: '' });

  ngOnInit(): void {
    this.loadPeriodos();
    this.loadLineas();
  }

  loadPeriodos(): void {
    this.api.get<PeriodoAca[]>('/periodo-aca').subscribe({
      next: (data) => {
        if (Array.isArray(data)) {
          // Sort periodos descending by Asig (e.g. 2026-I, 2025-II, 2025-I)
          data.sort((a, b) => b.Asig.localeCompare(a.Asig, undefined, { numeric: true, sensitivity: 'base' }));
          this.periodos.set(data);
          const activo = data.find(p => p.Activo);
          if (activo && !this.filterPeriodoId()) {
            this.filterPeriodoId.set(activo.Id);
            this.loadLineas();
          }
        }
      },
      error: () => {}
    });
  }

  loadLineas(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    const params: any = { page: this.currentPage(), per_page: this.perPage() };
    if (this.searchQuery()) params['search'] = this.searchQuery();
    if (this.filterPeriodoId()) params['periodo_id'] = this.filterPeriodoId();

    this.api.get<any>('/inv-lineas', params).subscribe({
      next: (res) => {
        // Soporte tanto array simple como paginado
        if (Array.isArray(res)) {
          this.lineas.set(res);
          this.total.set(res.length);
          this.lastPage.set(1);
        } else {
          this.lineas.set(Array.isArray(res.data) ? res.data : []);
          this.total.set(res.total ?? 0);
          this.currentPage.set(res.current_page ?? 1);
          this.lastPage.set(res.last_page ?? 1);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err?.error?.message || 'Error al cargar líneas de investigación');
      }
    });
  }

  applySearch(): void { this.searchQuery.set(this.tempSearch()); this.currentPage.set(1); this.loadLineas(); }
  clearSearch(): void { this.tempSearch.set(''); this.searchQuery.set(''); this.currentPage.set(1); this.loadLineas(); }
  onPeriodoChange(id: string): void { this.filterPeriodoId.set(id); this.currentPage.set(1); this.loadLineas(); }
  goToPage(p: number): void { if (p < 1 || p > this.lastPage()) return; this.currentPage.set(p); this.loadLineas(); }
  changePerPage(n: number): void { this.perPage.set(n); this.currentPage.set(1); this.loadLineas(); }

  getPeriodoNombre(id: string): string {
    return this.periodos().find(p => p.Id === id)?.Asig || '—';
  }

  openAdd(): void {
    this.isEditing.set(false);
    const activo = this.periodos().find(p => p.Activo) || this.periodos()[0];
    this.form.set({ Id: '', Id_PeriodoAca: activo?.Id || this.filterPeriodoId(), Linea: '' });
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(l: InvLinea): void {
    this.isEditing.set(true);
    this.form.set({ Id: l.Id, Id_PeriodoAca: l.Id_PeriodoAca, Linea: l.Linea });
    this.saveError.set('');
    this.showModal.set(true);
  }

  save(): void {
    const f = this.form();
    if (!f.Linea.trim()) { this.saveError.set('El nombre de la línea es obligatorio.'); return; }
    if (!f.Id_PeriodoAca) { this.saveError.set('Seleccione un periodo académico.'); return; }

    this.saving.set(true);
    this.saveError.set('');
    this.dnaLoader.show('Guardando', this.isEditing() ? 'Actualizando línea...' : 'Creando línea...');

    const req$ = this.isEditing()
      ? this.api.put<any>(`/inv-lineas/${f.Id}`, { Linea: f.Linea, Id_PeriodoAca: f.Id_PeriodoAca })
      : this.api.post<any>('/inv-lineas', { Linea: f.Linea, Id_PeriodoAca: f.Id_PeriodoAca });

    req$.subscribe({
      next: () => {
        this.saving.set(false); this.dnaLoader.hide(); this.showModal.set(false);
        this.alert.success(this.isEditing() ? 'Línea actualizada' : 'Línea creada');
        this.loadLineas();
      },
      error: (err) => {
        this.saving.set(false); this.dnaLoader.hide();
        this.saveError.set(err?.error?.message || 'Error al guardar.');
      }
    });
  }

  delete(l: InvLinea): void {
    this.alert.confirmDanger('¿Eliminar esta línea de investigación?', l.Linea, 'Eliminar').then(ok => {
      if (!ok) return;
      this.api.delete<any>(`/inv-lineas/${l.Id}`).subscribe({
        next: () => { this.alert.success('Línea eliminada'); this.loadLineas(); },
        error: (err) => this.alert.error('Error al eliminar', err?.error?.message || 'Error del servidor')
      });
    });
  }
}
