import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DateFormatPipe } from '../../../../pipes/date-format.pipe';
import { ApiService } from '../../../../services/api.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { AlertService } from '../../../../services/alert.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface InvLinea {
  Id: string;
  Id_PeriodoAca: string;
  Linea: string;
}

export interface Proyecto {
  Id: string;
  num_insercion: number;
  Titulo: string;
  Resumen: string;
  Responsable: string[];
  Asesor: string[];
  Id_Linea: string;
  Inicio: string;
  Fin?: string;
  Estado: string;
  Ganador: boolean;
  ImgCaratula?: string | null;
  PdfDocumento?: string | null;
  linea?: InvLinea;
}

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, FormsModule, DateFormatPipe],
  templateUrl: './projects.html',
})
export class ProjectsComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly dnaLoader = inject(DnaLoaderService);
  private readonly alert = inject(AlertService);
  private readonly sanitizer = inject(DomSanitizer);

  // --- PDF Modals & States (Frontend simulated for design demonstration) ---
  showUploadPdfModal = signal<boolean>(false);
  showPreviewPdfModal = signal<boolean>(false);
  selectedProjectForPdf = signal<Proyecto | null>(null);
  previewProject = signal<Proyecto | null>(null);
  selectedPdfFile = signal<File | null>(null);
  isUploadingPdf = signal<boolean>(false);
  pdfUploadError = signal<string>('');
  previewPdfUrl = signal<SafeResourceUrl | null>(null);

  // --- Lista y estado ---
  proyectos = signal<Proyecto[]>([]);
  lineas = signal<InvLinea[]>([]);
  isLoading = signal<boolean>(false);
  loadError = signal<string>('');

  // --- Paginación ---
  total = signal<number>(0);
  currentPage = signal<number>(1);
  perPage = signal<number>(10);
  lastPage = signal<number>(1);

  // --- Búsqueda ---
  searchQuery = signal<string>('');
  tempSearch = signal<string>('');

  readonly totalPages = computed(() => this.lastPage());
  readonly pagesArray = computed(() => Array.from({ length: this.lastPage() }, (_, i) => i + 1));

  // --- Modal ---
  showModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  saving = signal<boolean>(false);
  saveError = signal<string>('');
  responsableText = signal<string>('');
  asesorText = signal<string>('');

  form = signal<{
    Id: string; Titulo: string; Resumen: string; Id_Linea: string;
    Inicio: string; Fin: string; Estado: string; Ganador: boolean;
  }>({ Id: '', Titulo: '', Resumen: '', Id_Linea: '', Inicio: '', Fin: '', Estado: 'Planteamiento', Ganador: false });

  readonly stats = computed(() => {
    const list = this.proyectos();
    return {
      total: this.total(),
      enEjecucion: list.filter(p => p.Estado === 'En Ejecución').length,
      concluidos: list.filter(p => p.Estado === 'Concluido').length,
      ganadores: list.filter(p => p.Ganador).length,
    };
  });

  ngOnInit(): void {
    this.loadProyectos();
    this.loadLineas();
  }

  loadProyectos(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    const params: any = { page: this.currentPage(), per_page: this.perPage() };
    if (this.searchQuery()) params['search'] = this.searchQuery();

    this.apiService.get<any>('/proyectos', params).subscribe({
      next: (res) => {
        this.proyectos.set(Array.isArray(res.data) ? res.data : []);
        this.total.set(res.total ?? 0);
        this.currentPage.set(res.current_page ?? 1);
        this.lastPage.set(res.last_page ?? 1);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadError.set(err?.error?.message || 'Error al cargar proyectos');
      }
    });
  }

  loadLineas(): void {
    // Solicitar un per_page alto (999) para traer todas las líneas en el combobox de selección
    this.apiService.get<any>('/inv-lineas', { per_page: 999 }).subscribe({
      next: (res) => {
        if (res && Array.isArray(res.data)) {
          this.lineas.set(res.data);
        } else if (Array.isArray(res)) {
          this.lineas.set(res);
        } else {
          this.lineas.set([]);
        }
      },
      error: () => {}
    });
  }

  applySearch(): void {
    this.searchQuery.set(this.tempSearch());
    this.currentPage.set(1);
    this.loadProyectos();
  }

  clearSearch(): void {
    this.tempSearch.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.loadProyectos();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.lastPage()) return;
    this.currentPage.set(page);
    this.loadProyectos();
  }

  changePerPage(n: number): void {
    this.perPage.set(n);
    this.currentPage.set(1);
    this.loadProyectos();
  }

  openAdd(): void {
    this.isEditing.set(false);
    this.form.set({ Id: '', Titulo: '', Resumen: '', Id_Linea: '', Inicio: new Date().toISOString().split('T')[0], Fin: '', Estado: 'Planteamiento', Ganador: false });
    this.responsableText.set('');
    this.asesorText.set('');
    this.saveError.set('');
    this.showModal.set(true);
  }

  openEdit(p: Proyecto): void {
    this.isEditing.set(true);
    this.form.set({
      Id: p.Id, Titulo: p.Titulo, Resumen: p.Resumen, Id_Linea: p.Id_Linea,
      Inicio: p.Inicio?.split('T')[0] || '', Fin: p.Fin?.split('T')[0] || '',
      Estado: p.Estado, Ganador: p.Ganador,
    });
    this.responsableText.set(Array.isArray(p.Responsable) ? p.Responsable.join(', ') : '');
    this.asesorText.set(Array.isArray(p.Asesor) ? p.Asesor.join(', ') : '');
    this.saveError.set('');
    this.showModal.set(true);
  }

  save(): void {
    const f = this.form();
    if (!f.Titulo.trim() || !f.Id_Linea || !f.Inicio) {
      this.saveError.set('Título, línea de investigación e inicio son obligatorios.');
      return;
    }
    const responsable = this.responsableText().split(',').map(s => s.trim()).filter(Boolean);
    const asesor = this.asesorText().split(',').map(s => s.trim()).filter(Boolean);
    if (!responsable.length) { this.saveError.set('Ingrese al menos un responsable.'); return; }
    if (!asesor.length) { this.saveError.set('Ingrese al menos un asesor.'); return; }

    const payload = { ...f, Responsable: responsable, Asesor: asesor };
    this.saving.set(true);
    this.saveError.set('');
    this.dnaLoader.show('Guardando', this.isEditing() ? 'Actualizando proyecto...' : 'Creando proyecto...');

    const req$ = this.isEditing()
      ? this.apiService.put<any>(`/proyectos/${f.Id}`, payload)
      : this.apiService.post<any>('/proyectos', payload);

    req$.subscribe({
      next: () => {
        this.saving.set(false); this.dnaLoader.hide(); this.showModal.set(false);
        this.alert.success(this.isEditing() ? 'Proyecto actualizado' : 'Proyecto creado');
        this.loadProyectos();
      },
      error: (err) => {
        this.saving.set(false); this.dnaLoader.hide();
        this.saveError.set(err?.error?.message || 'Error al guardar el proyecto.');
      }
    });
  }

  delete(p: Proyecto): void {
    this.alert.confirmDanger('¿Eliminar este proyecto?', p.Titulo).then(ok => {
      if (!ok) return;
      this.apiService.delete<any>(`/proyectos/${p.Id}`).subscribe({
        next: () => { this.alert.success('Proyecto eliminado'); this.loadProyectos(); },
        error: (err) => this.alert.error('Error al eliminar', err?.error?.message || 'Error del servidor')
      });
    });
  }

  getLinea(id: string): string {
    return this.lineas().find(l => l.Id === id)?.Linea || '—';
  }

  // --- PDF Actions (Simuladas en Frontend para feedback de diseño) ---
  openUploadPdf(p: Proyecto): void {
    this.selectedProjectForPdf.set(p);
    this.selectedPdfFile.set(null);
    this.pdfUploadError.set('');
    this.isUploadingPdf.set(false);
    this.showUploadPdfModal.set(true);
  }

  onPdfFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        this.pdfUploadError.set('El archivo seleccionado debe ser un PDF válido.');
        this.selectedPdfFile.set(null);
        return;
      }
      this.pdfUploadError.set('');
      this.selectedPdfFile.set(file);
    }
  }

  uploadPdf(): void {
    const project = this.selectedProjectForPdf();
    const file = this.selectedPdfFile();
    if (!project || !file) return;

    this.isUploadingPdf.set(true);
    this.pdfUploadError.set('');

    setTimeout(() => {
      this.isUploadingPdf.set(false);
      this.showUploadPdfModal.set(false);

      // Actualizar localmente para ver el diseño funcionando de inmediato
      this.proyectos.update(list =>
        list.map(p => p.Id === project.Id ? { ...p, PdfDocumento: 'uploads/proyectos/mock_project_doc.pdf' } : p)
      );

      this.alert.success(
        'Documento PDF subido',
        `El archivo "${file.name}" fue cargado correctamente al proyecto "${project.Titulo}".`
      );
    }, 1500);
  }

  previewProjectPdf(p: Proyecto): void {
    this.previewProject.set(p);
    // Usamos un PDF dummy para la previsualización interactiva en el iframe
    const mockPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
    this.previewPdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(mockPdfUrl));
    this.showPreviewPdfModal.set(true);
  }
}
