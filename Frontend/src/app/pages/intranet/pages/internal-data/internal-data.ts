import { Component, signal, computed, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { AlertService } from '../../../../services/alert.service';
import { ModalComponent } from '../../../../components/modal/modal.component';
import { PaginationComponent } from '../../../../components/pagination/pagination.component';

@Component({
  selector: 'app-internal-data',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PaginationComponent],
  templateUrl: './internal-data.html',
})
export class InternalDataComponent {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly alert = inject(AlertService);

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
  isEditing = signal<boolean>(false);

  private loadDataTimeout: any;

  internalForm = signal<{
    DNI: string; Procedencia: string; TipoAsistente: string;
    Nombres: string; ApPaterno: string; ApMaterno: string;
    Grado: string; Correo: string; NumCelular: string;
  }>({
    DNI: '', Procedencia: 'Interno', TipoAsistente: 'Estudiante',
    Nombres: '', ApPaterno: '', ApMaterno: '', Grado: '', Correo: '', NumCelular: '',
  });

  readonly filteredAndPaginatedInternalData = computed(() => {
    const items = this.internalDataList();
    const totalItems = this.totalInternalItems();
    const size = this.internalPageSize();
    const totalPages = Math.ceil(totalItems / size) || 1;
    return { items, totalItems, totalPages };
  });

  constructor() {
    effect(() => {
      this.internalCurrentPage();
      this.internalPageSize();
      this.internalSortColumn();
      if (this.platformService.isLoggedIn()) {
        this.loadInternalData();
      }
    });
  }

  loadInternalData(): void {
    if (!this.platformService.isLoggedIn()) return;
    if (this.loadDataTimeout) clearTimeout(this.loadDataTimeout);
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
        error: () => this.loadingInternalData.set(false)
      });
    }, 150);
  }

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

  openAddInternal(): void {
    this.isEditing.set(false);
    this.internalForm.set({
      DNI: '', Procedencia: 'Interno', TipoAsistente: 'Estudiante',
      Nombres: '', ApPaterno: '', ApMaterno: '', Grado: '', Correo: '', NumCelular: '',
    });
    this.showInternalModal.set(true);
  }

  openEditInternal(item: any): void {
    this.isEditing.set(true);
    this.internalForm.set({
      DNI: item.DNI, Procedencia: item.Procedencia, TipoAsistente: item.TipoAsistente,
      Nombres: item.Nombres, ApPaterno: item.ApPaterno, ApMaterno: item.ApMaterno,
      Grado: item.Grado || '', Correo: item.Correo || '', NumCelular: item.NumCelular || '',
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
      NumCelular: rawForm.NumCelular ? rawForm.NumCelular.trim() : '',
    };
    if (!form.DNI || !form.Nombres || !form.ApPaterno || !form.ApMaterno) {
      this.alert.warning('DNI, Nombres y Apellidos son obligatorios.');
      return;
    }
    if (this.isEditing()) {
      this.apiService.put<any>(`/data-interna/${form.DNI}`, form).subscribe({
        next: () => { this.alert.success('Registro actualizado con éxito.'); this.showInternalModal.set(false); this.loadInternalData(); },
        error: (err) => this.alert.error(err?.error?.message || 'Error al actualizar.')
      });
    } else {
      this.apiService.post<any>('/data-interna', form).subscribe({
        next: () => { this.alert.success('Registro creado con éxito.'); this.showInternalModal.set(false); this.loadInternalData(); },
        error: (err) => this.alert.error(err?.error?.message || 'El DNI ya existe o error de servidor.')
      });
    }
  }

  deleteInternal(dni: string): void {
    this.alert.confirmDanger('¿Está seguro de eliminar este registro interno?').then(ok => {
      if (!ok) return;
      this.apiService.delete<any>(`/data-interna/${dni}`).subscribe({
        next: () => { this.alert.success('Registro eliminado.'); this.loadInternalData(); },
        error: (err) => this.alert.error(err?.error?.message || 'Error al eliminar.')
      });
    });
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
        if (resp.errors?.length > 0) {
          this.importError.set('Advertencias:\n' + resp.errors.join('\n'));
        }
        this.loadInternalData();
      },
      error: (err) => {
        this.importingCsv.set(false);
        this.importError.set(err?.error?.message || 'Error de conexión o formato en el archivo.');
      }
    });
  }
}
