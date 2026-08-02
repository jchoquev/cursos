import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../services/api.service';
import { AlertService } from '../../../../services/alert.service';
import { PlatformService } from '../../../../services/platform.service';

export interface TipoAsistente {
  id: number;
  AsigTipo: string;
  created_at?: string;
}

@Component({
  selector: 'app-tipo-asistentes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tipo-asistentes.html',
})
export class TipoAsistentesComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly alert = inject(AlertService);
  private readonly platformService = inject(PlatformService);

  tipos = signal<TipoAsistente[]>([]);
  isLoading = signal(false);
  showModal = signal(false);
  isEditing = signal(false);
  saving = signal(false);
  saveError = signal('');
  editingId = signal<number | null>(null);
  searchQuery = signal('');
  sortDirection = signal<'asc' | 'desc'>('asc');
  form = signal({ AsigTipo: '' });

  readonly filtered = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const direction = this.sortDirection();
    let list = [...this.tipos()];
    if (query) list = list.filter(tipo => tipo.AsigTipo.toLowerCase().includes(query));
    list.sort((a, b) => {
      const result = a.AsigTipo.localeCompare(b.AsigTipo, undefined, { sensitivity: 'base' });
      return direction === 'asc' ? result : -result;
    });
    return list;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading.set(true);
    this.apiService.get<TipoAsistente[]>('/tipo-asistentes').subscribe({
      next: data => { this.tipos.set(Array.isArray(data) ? data : []); this.isLoading.set(false); },
      error: () => { this.isLoading.set(false); this.alert.error('No se pudieron cargar los tipos de asistente.'); },
    });
  }

  toggleSort(): void { this.sortDirection.update(direction => direction === 'asc' ? 'desc' : 'asc'); }

  openAdd(): void {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form.set({ AsigTipo: '' });
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(tipo: TipoAsistente): void {
    this.isEditing.set(true);
    this.editingId.set(tipo.id);
    this.form.set({ AsigTipo: tipo.AsigTipo });
    this.saveError.set('');
    this.showModal.set(true);
  }

  save(): void {
    const name = this.form().AsigTipo.trim();
    if (!name) { this.saveError.set('El nombre del tipo es obligatorio.'); return; }

    this.saving.set(true);
    const request = this.isEditing()
      ? this.apiService.put<any>(`/tipo-asistentes/${this.editingId()}`, { AsigTipo: name })
      : this.apiService.post<any>('/tipo-asistentes', { AsigTipo: name });

    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.showModal.set(false);
        this.platformService.loadTipoAsistentes();
        this.load();
        this.alert.success(this.isEditing() ? 'Tipo de asistente actualizado.' : 'Tipo de asistente creado.');
      },
      error: error => {
        this.saving.set(false);
        this.saveError.set(error?.error?.message || 'No se pudo guardar el tipo de asistente.');
      },
    });
  }

  delete(tipo: TipoAsistente): void {
    this.alert.confirmDanger(`¿Eliminar el tipo "${tipo.AsigTipo}"?`).then(confirmed => {
      if (!confirmed) return;
      this.apiService.delete<any>(`/tipo-asistentes/${tipo.id}`).subscribe({
        next: () => { this.load(); this.platformService.loadTipoAsistentes(); this.alert.success('Tipo de asistente eliminado.'); },
        error: error => this.alert.error(error?.error?.message || 'No se pudo eliminar el tipo de asistente.'),
      });
    });
  }
}
