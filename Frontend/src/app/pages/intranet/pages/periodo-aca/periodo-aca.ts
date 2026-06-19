import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AlertService } from '../../../../services/alert.service';

export interface PeriodoAca {
  Id: string;
  Asig: string;
  Activo: boolean;
  created_at?: string;
}

@Component({
  selector: 'app-periodo-aca',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './periodo-aca.html',
})
export class PeriodoAcaComponent implements OnInit {
  readonly Math = Math;
  private readonly apiService = inject(ApiService);
  private readonly alert = inject(AlertService);

  periodos = signal<PeriodoAca[]>([]);
  isLoading = signal<boolean>(false);
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  saving = signal<boolean>(false);
  saveError = signal<string>('');
  editingId = signal<string>('');

  searchQuery = signal<string>('');
  sortCol = signal<string>('Asig');
  sortDir = signal<'asc' | 'desc'>('asc');
  currentPage = signal<number>(1);
  pageSize = signal<number>(10);

  form = signal<{ Asig: string; Activo: boolean }>({ Asig: '', Activo: false });

  readonly filtered = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const col = this.sortCol();
    const dir = this.sortDir();
    const page = this.currentPage();
    const size = this.pageSize();
    let list = [...this.periodos()];
    if (q) list = list.filter(p => p.Asig.toLowerCase().includes(q));
    list.sort((a: any, b: any) => {
      const vA = a[col] ?? ''; const vB = b[col] ?? '';
      return dir === 'asc' ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
    });
    const start = (page - 1) * size;
    return { items: list.slice(start, start + size), total: list.length, pages: Math.ceil(list.length / size) || 1 };
  });

  getPagesArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i + 1); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.apiService.get<PeriodoAca[]>('/periodo-aca').subscribe({
      next: (data) => { this.periodos.set(data); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); }
    });
  }

  openAdd(): void {
    this.isEditing.set(false);
    this.editingId.set('');
    this.saveError.set('');
    this.form.set({ Asig: '', Activo: false });
    this.showModal.set(true);
  }

  openEdit(p: PeriodoAca): void {
    this.isEditing.set(true);
    this.editingId.set(p.Id);
    this.saveError.set('');
    this.form.set({ Asig: p.Asig, Activo: p.Activo });
    this.showModal.set(true);
  }

  changeSort(col: string): void {
    if (this.sortCol() === col) { this.sortDir.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.sortCol.set(col); this.sortDir.set('asc'); }
    this.currentPage.set(1);
  }

  save(): void {
    const f = this.form();
    if (!f.Asig.trim()) { this.saveError.set('El nombre del periodo es obligatorio.'); return; }
    this.saving.set(true); this.saveError.set('');

    const req = this.isEditing()
      ? this.apiService.put<any>('/periodo-aca/' + this.editingId(), f)
      : this.apiService.post<any>('/periodo-aca', f);

    req.subscribe({
      next: () => { this.saving.set(false); this.showModal.set(false); this.load(); },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.message || 'Error al guardar el periodo.');
      }
    });
  }

  delete(p: PeriodoAca): void {
    if (p.Activo) { this.alert.warning('No se puede eliminar el periodo activo. Active otro periodo primero.'); return; }
    this.alert.confirmDanger('¿Eliminar el periodo "' + p.Asig + '"?').then(ok => {
      if (!ok) return;
      this.apiService.delete<any>('/periodo-aca/' + p.Id).subscribe({
        next: () => { this.load(); },
        error: (err) => { this.alert.error(err?.error?.message || 'Error al eliminar el periodo.'); }
      });
    });
  }

  activar(p: PeriodoAca): void {
    if (p.Activo) return;
    this.alert.confirmDanger('¿Activar el periodo "' + p.Asig + '"?', 'El periodo activo actual será desactivado.', 'Activar').then(ok => {
      if (!ok) return;
      this.apiService.put<any>('/periodo-aca/' + p.Id, { Asig: p.Asig, Activo: true }).subscribe({
        next: () => { this.load(); },
        error: (err) => { this.alert.error(err?.error?.message || 'Error al activar el periodo.'); }
      });
    });
  }
}
