import { Component, signal, computed, inject, OnInit, OnDestroy, PLATFORM_ID, afterNextRender } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, EventItem } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';
import { AlertService } from '../../../../services/alert.service';
import { environment } from '../../../../../environments/environment';
import { ModalComponent } from '../../../../components/modal/modal.component';

@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorModule, ModalComponent],
  templateUrl: './courses.html',
})
export class CoursesComponent implements OnInit, OnDestroy {
  readonly backendUrl = environment.backendUrl;
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dnaLoader = inject(DnaLoaderService);
  private readonly alert = inject(AlertService);

  showEventModal = signal<boolean>(false);
  academicPeriods = signal<any[]>([]);
  isEditing = signal<boolean>(false);
  savingEvent = signal<boolean>(false);
  saveEventError = signal<string>('');
  bannerFile: File | null = null;

  showDocsConfigModal = signal<boolean>(false);
  loadingDocsConfig = signal<boolean>(false);
  savingDocsConfig = signal<boolean>(false);
  docsConfigList = signal<any[]>([]);
  selectedCourseForDocs = signal<EventItem | null>(null);

  isBrowser = false;
  editor!: Editor;
  editorTexto01!: Editor;
  editorTexto02!: Editor;
  editorInitialContent = '';

  toolbar: Toolbar = [
    ['bold', 'italic', 'underline'], ['code'], ['link'],
    ['text_color', 'background_color'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
  ];

  eventForm = signal<{
    id: any; title: string; type: EventItem['type']; date: string;
    description: string; fullDescription: string; imageGradient: string;
    icon: string; status: EventItem['status']; hours: number; instructor: string;
    capacity: number; coverUrl?: string; registrationStartDate?: string;
    registrationEndDate?: string; courseStartDate?: string; courseEndDate?: string;
    Id_PeriodoAca?: string | null;
  }>({
    id: 0, title: '', type: 'Curso', date: '', description: '', fullDescription: '',
    imageGradient: 'from-wine-700 to-wine-900', icon: '📚', status: 'activo',
    hours: 20, instructor: '', capacity: 30, coverUrl: '',
    registrationStartDate: '', registrationEndDate: '', courseStartDate: '', courseEndDate: '',
    Id_PeriodoAca: '',
  });

  docsForm = signal<{
    id?: string; pdfResolucion?: string; Fondo?: string; Resolucion: string;
    Tipo: string; Texto01: string; Texto02: string; FechEmision: string;
    Firma01: string; Firma02: string; Firma03: string; TipoAsistente: number;
  }>({
    Resolucion: '', pdfResolucion: '', Fondo: '', Tipo: '',
    Texto01: '', Texto02: '', FechEmision: '', Firma01: '', Firma02: '', Firma03: '', TipoAsistente: 1
  });

  enableFirma01 = signal<boolean>(false);
  enableFirma02 = signal<boolean>(false);
  enableFirma03 = signal<boolean>(false);
  selectedPdfFile = signal<File | null>(null);
  selectedFondoFile = signal<File | null>(null);

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
        e.title.toLowerCase().includes(query) || e.instructor.toLowerCase().includes(query) ||
        e.type.toLowerCase().includes(query) || e.date.toLowerCase().includes(query) ||
        this.getAcademicPeriodName(e).toLowerCase().includes(query)
      );
    }
    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || ''; const valB = b[sortCol] || '';
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    const start = (page - 1) * size;
    return { items: list.slice(start, start + size), totalItems: list.length, totalPages: Math.ceil(list.length / size) || 1 };
  });

  changeEventSort(column: string): void {
    if (this.eventSortColumn() === column) { this.eventSortDirection.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.eventSortColumn.set(column); this.eventSortDirection.set('asc'); }
    this.eventCurrentPage.set(1);
  }

  getPagesArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i + 1); }
  getMinRecord(page: number, size: number, total: number): number { return Math.min(page * size, total); }

  getAcademicPeriodName(event: EventItem): string {
    if (event.periodoAsig) return event.periodoAsig;
    return this.academicPeriods().find(period => period.Id === event.Id_PeriodoAca)?.Asig || 'Sin periodo';
  }

  constructor() {
    afterNextRender(() => {
      this.isBrowser = true;
      this.editor = new Editor();
      this.editorTexto01 = new Editor();
      this.editorTexto02 = new Editor();
    });
  }

  loadPeriods(): void {
    this.apiService.get<any[]>('/periodo-aca').subscribe({
      next: (periods) => {
        if (Array.isArray(periods)) {
          this.academicPeriods.set(periods);
          // Si el modal está abierto y no tiene periodo asignado, preseleccionar el activo
          const currentForm = this.eventForm();
          if (this.showEventModal() && !currentForm.Id_PeriodoAca) {
            const activePeriod = periods.find(p => p.Activo) || periods[0];
            if (activePeriod) {
              this.eventForm.update(f => ({ ...f, Id_PeriodoAca: activePeriod.Id }));
            }
          }
        }
      }
    });
  }

  ngOnInit(): void {
    this.platformService.loadEvents();
    this.loadPeriods();
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      if (this.editor) this.editor.destroy();
      if (this.editorTexto01) this.editorTexto01.destroy();
      if (this.editorTexto02) this.editorTexto02.destroy();
    }
  }

  openAddEvent(): void {
    this.isEditing.set(false);
    this.editorInitialContent = '';
    this.saveEventError.set('');
    this.savingEvent.set(false);
    
    const periods = this.academicPeriods();
    const activePeriod = periods.find(p => p.Activo) || periods[0];
    const defaultPeriodId = activePeriod ? activePeriod.Id : '';

    this.eventForm.set({
      id: 0, title: '', type: 'Curso',
      date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      description: '', fullDescription: '',
      imageGradient: 'from-rose-600 via-pink-600 to-red-700', icon: '📚',
      status: 'activo', hours: 30, instructor: '', capacity: 35, coverUrl: '',
      registrationStartDate: '', registrationEndDate: '', courseStartDate: '', courseEndDate: '',
      Id_PeriodoAca: defaultPeriodId,
    });
    this.showEventModal.set(true);
  }

  openEditEvent(event: EventItem): void {
    this.isEditing.set(true);
    this.editorInitialContent = event.description || '';
    
    const periods = this.academicPeriods();
    const activePeriod = periods.find(p => p.Activo) || periods[0];
    const defaultPeriodId = activePeriod ? activePeriod.Id : '';

    this.eventForm.set({
      id: event.id, title: event.title, type: event.type, date: event.date,
      description: event.description, fullDescription: event.fullDescription,
      imageGradient: event.imageGradient, icon: event.icon, status: event.status,
      hours: event.hours, instructor: event.instructor, capacity: event.capacity,
      coverUrl: event.coverUrl || '',
      registrationStartDate: event.registrationStartDate || '',
      registrationEndDate: event.registrationEndDate || '',
      courseStartDate: event.courseStartDate || '',
      courseEndDate: event.courseEndDate || '',
      Id_PeriodoAca: event.Id_PeriodoAca || defaultPeriodId,
    });
    this.showEventModal.set(true);
  }

  onBannerSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.bannerFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => { this.eventForm.update(f => ({ ...f, coverUrl: e.target.result })); };
      reader.readAsDataURL(file);
    }
  }

  getInstructorsList(): string[] {
    return (this.eventForm().instructor || '').split(',').map(s => s.trim()).filter(Boolean);
  }

  addInstructor(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.getInstructorsList();
    if (!current.includes(trimmed)) {
      current.push(trimmed);
      this.eventForm.update(f => ({ ...f, instructor: current.join(', ') }));
    }
  }

  removeInstructor(name: string): void {
    const current = this.getInstructorsList().filter(n => n !== name);
    this.eventForm.update(f => ({ ...f, instructor: current.join(', ') }));
  }

  onEditorInput(html: string): void {
    this.eventForm.update(f => ({ ...f, description: html, fullDescription: html }));
  }

  saveEvent(): void {
    const form = this.eventForm();
    this.saveEventError.set('');
    const missingFields: string[] = [];
    if (!form.title) missingFields.push('Título');
    if (!form.description) missingFields.push('Descripción');
    if (!form.hours || form.hours <= 0) missingFields.push('Horas Académicas');
    if (!form.registrationStartDate) missingFields.push('Inicio Inscripción');
    if (!form.registrationEndDate) missingFields.push('Fin Inscripción');
    if (!form.courseStartDate) missingFields.push('Inicio Curso');
    if (!form.courseEndDate) missingFields.push('Fin Curso');
    if (!form.type) missingFields.push('Tipo de Actividad');
    if (!form.instructor) missingFields.push('Docentes Expositores');
    if (!form.capacity || form.capacity <= 0) missingFields.push('Capacidad Máxima');
    if (missingFields.length > 0) { this.saveEventError.set('Campos requeridos faltantes: ' + missingFields.join(', ')); return; }

    const tipoActividad = this.platformService.activityTypes().find(t => t.tipActividad === form.type);
    const tActividadId = tipoActividad ? tipoActividad.id : 1;
    const instructorsList = this.getInstructorsList();

    if (this.isEditing()) {
      const formData = new FormData();
      formData.append('_method', 'PUT');
      formData.append('titulo', form.title);
      if (this.bannerFile) formData.append('RBanner', this.bannerFile, this.bannerFile.name);
      formData.append('descripcion', form.description);
      formData.append('HAcademica', String(form.hours));
      formData.append('InInscripcion', form.registrationStartDate || '');
      formData.append('FnInscripcion', form.registrationEndDate || '');
      formData.append('InCurso', form.courseStartDate || '');
      formData.append('FnCurso', form.courseEndDate || '');
      formData.append('TActividad', String(tActividadId));
      formData.append('DonceteExp', JSON.stringify(instructorsList));
      formData.append('CapMaxima', String(form.capacity));
      formData.append('Estado', form.status === 'activo' ? '1' : '0');
      if (form.Id_PeriodoAca) formData.append('Id_PeriodoAca', form.Id_PeriodoAca);
      this.savingEvent.set(true);
      this.dnaLoader.show('Guardando Curso', 'Actualizando información del curso...');
      this.apiService.postFormData<any>(`/eventos/${form.id}`, formData).subscribe({
        next: (resp) => {
          this.savingEvent.set(false); this.dnaLoader.hide(); this.bannerFile = null;
          const updatedEvent = this.platformService.mapBackendEventoToEventItem(resp.data);
          this.platformService.editEvent(updatedEvent);
          this.showEventModal.set(false);
          this.alert.success('Evento académico actualizado correctamente.');
        },
        error: (err) => {
          this.savingEvent.set(false); this.dnaLoader.hide();
          const backendMsg = err?.error?.message || err?.error?.errors;
          if (backendMsg && typeof backendMsg === 'object') {
            this.saveEventError.set('Error de validación: ' + Object.values(backendMsg).flat().join(' | '));
          } else { this.saveEventError.set(backendMsg || 'Error al actualizar el evento.'); }
        }
      });
    } else {
      if (!this.bannerFile) { this.saveEventError.set('Debe seleccionar una imagen de banner.'); return; }
      const formData = new FormData();
      formData.append('titulo', form.title);
      formData.append('RBanner', this.bannerFile, this.bannerFile.name);
      formData.append('descripcion', form.description);
      formData.append('HAcademica', String(form.hours));
      formData.append('InInscripcion', form.registrationStartDate || '');
      formData.append('FnInscripcion', form.registrationEndDate || '');
      formData.append('InCurso', form.courseStartDate || '');
      formData.append('FnCurso', form.courseEndDate || '');
      formData.append('TActividad', String(tActividadId));
      formData.append('DonceteExp', JSON.stringify(instructorsList));
      formData.append('CapMaxima', String(form.capacity));
      formData.append('Estado', form.status === 'activo' ? '1' : '0');
      if (form.Id_PeriodoAca) formData.append('Id_PeriodoAca', form.Id_PeriodoAca);
      this.savingEvent.set(true);
      this.dnaLoader.show('Guardando Curso', 'Creando nuevo curso académico...');
      this.apiService.postFormData<any>('/eventos', formData).subscribe({
        next: (resp) => {
          this.savingEvent.set(false); this.dnaLoader.hide(); this.bannerFile = null;
          const createdEvent = this.platformService.mapBackendEventoToEventItem(resp.data);
          this.platformService.addEvent(createdEvent);
          this.showEventModal.set(false);
          this.alert.success('Evento académico creado correctamente.');
        },
        error: (err) => {
          this.savingEvent.set(false); this.dnaLoader.hide();
          const backendMsg = err?.error?.message || err?.error?.errors;
          if (backendMsg && typeof backendMsg === 'object') {
            this.saveEventError.set('Error de validación: ' + Object.values(backendMsg).flat().join(' | '));
          } else { this.saveEventError.set(backendMsg || 'Error al crear el evento.'); }
        }
      });
    }
  }

  deleteEvent(id: any): void {
    this.alert.confirmDanger('¿Está seguro de eliminar este evento?', 'Se eliminarán de forma permanente todos sus registros e inscripciones.').then(ok => {
      if (!ok) return;
      this.apiService.delete<any>(`/eventos/${id}`).subscribe({
        next: () => { this.platformService.deleteEvent(id); this.alert.success('Evento eliminado correctamente.'); },
        error: () => { this.alert.error('Error al eliminar el evento de la base de datos.'); }
      });
    });
  }

  // Docs config methods
  selectCourseForDocs(event: EventItem): void {
    this.selectedCourseForDocs.set(event);
    this.resetDocsForm(1);
    this.loadCourseDocsConfig(event.id, false);
    this.showDocsConfigModal.set(true);
  }

  loadCourseDocsConfig(eventId: any, autoLoadForm: boolean = true): void {
    this.loadingDocsConfig.set(true);
    this.apiService.get<any[]>('/e-documentos', { evento_id: eventId }).subscribe({
      next: (data) => {
        this.loadingDocsConfig.set(false);
        if (Array.isArray(data)) {
          this.docsConfigList.set(data);
          if (autoLoadForm) this.selectAsistenteTypeForDocs(this.docsForm().TipoAsistente);
        }
      },
      error: () => { this.loadingDocsConfig.set(false); }
    });
  }

  selectAsistenteTypeForDocs(tipoId: number): void {
    this.selectedPdfFile.set(null); this.selectedFondoFile.set(null);
    const pdfInput = document.getElementById('resolucionPdfInput') as HTMLInputElement;
    if (pdfInput) pdfInput.value = '';
    const fondoInput = document.getElementById('docsFondoInput') as HTMLInputElement;
    if (fondoInput) fondoInput.value = '';
    this.docsForm.update(f => ({ ...f, TipoAsistente: tipoId }));
    const existing = this.docsConfigList().find(c => Number(c.TipoAsistente) === Number(tipoId));
    if (existing) {
      this.docsForm.set({
        id: existing.id, pdfResolucion: existing.pdfResolucion || '',
        Fondo: existing.Fondo || '', Resolucion: existing.Resolucion || '',
        Tipo: existing.Tipo || '', Texto01: existing.Texto01 || '', Texto02: existing.Texto02 || '',
        FechEmision: existing.FechEmision ? existing.FechEmision.substring(0, 10) : '',
        Firma01: existing.Firma01 || '', Firma02: existing.Firma02 || '',
        Firma03: existing.Firma03 || '', TipoAsistente: tipoId
      });
      this.enableFirma01.set(!!existing.Firma01);
      this.enableFirma02.set(!!existing.Firma02);
      this.enableFirma03.set(!!existing.Firma03);
    } else {
      this.resetDocsForm(tipoId);
    }
  }

  resetDocsForm(tipoId: number = 1): void {
    this.docsForm.set({ Resolucion: '', pdfResolucion: '', Fondo: '', Tipo: '', Texto01: '', Texto02: '', FechEmision: '', Firma01: '', Firma02: '', Firma03: '', TipoAsistente: tipoId });
    this.enableFirma01.set(false); this.enableFirma02.set(false); this.enableFirma03.set(false);
    this.selectedPdfFile.set(null); this.selectedFondoFile.set(null);
    const pdfInput = document.getElementById('resolucionPdfInput') as HTMLInputElement;
    if (pdfInput) pdfInput.value = '';
    const fondoInput = document.getElementById('docsFondoInput') as HTMLInputElement;
    if (fondoInput) fondoInput.value = '';
  }

  onPdfFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') { this.alert.error('Por favor, seleccione un archivo PDF válido.'); event.target.value = ''; return; }
      this.selectedPdfFile.set(file);
    }
  }

  onFondoFileChange(event: any): void {
    const file = event.target?.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) { this.alert.error('Por favor, seleccione una imagen válida.'); event.target.value = ''; return; }
      this.selectedFondoFile.set(file);
    }
  }

  toggleFirma01(val: boolean): void { this.enableFirma01.set(val); if (!val) this.docsForm.update(f => ({ ...f, Firma01: '' })); }
  toggleFirma02(val: boolean): void { this.enableFirma02.set(val); if (!val) this.docsForm.update(f => ({ ...f, Firma02: '' })); }
  toggleFirma03(val: boolean): void { this.enableFirma03.set(val); if (!val) this.docsForm.update(f => ({ ...f, Firma03: '' })); }

  saveDocsConfig(): void {
    const course = this.selectedCourseForDocs();
    if (!course) return;
    this.savingDocsConfig.set(true);
    const form = this.docsForm();
    const formData = new FormData();
    if (form.id) formData.append('id', form.id);
    formData.append('Id_evento', course.id);
    formData.append('TipoAsistente', String(form.TipoAsistente));
    formData.append('Resolucion', form.Resolucion || '');
    formData.append('Tipo', form.Tipo || '');
    formData.append('Texto01', form.Texto01 || '');
    formData.append('Texto02', form.Texto02 || '');
    formData.append('FechEmision', form.FechEmision || '');
    formData.append('Firma01', form.Firma01 || '');
    formData.append('Firma02', form.Firma02 || '');
    formData.append('Firma03', form.Firma03 || '');
    const pdfFile = this.selectedPdfFile();
    if (pdfFile) formData.append('pdfResolucion', pdfFile);
    const fondoFile = this.selectedFondoFile();
    if (fondoFile) formData.append('Fondo', fondoFile);
    this.apiService.postFormData<any>('/e-documentos', formData).subscribe({
      next: () => {
        this.savingDocsConfig.set(false);
        this.alert.success('Configuración del documento guardada con éxito.');
        this.resetDocsForm(form.TipoAsistente);
        this.loadCourseDocsConfig(course.id, false);
      },
      error: (err) => {
        this.savingDocsConfig.set(false);
        this.alert.error('Error al guardar la configuración', err?.error?.message || 'Error de servidor');
      }
    });
  }

  deleteDocsConfig(config: any): void {
    this.alert.confirmDanger(`¿Está seguro de eliminar la configuración para el rol "${config.tipo_asistente_rel?.AsigTipo || 'ASISTENTE'}"?`).then(ok => {
      if (!ok) return;
      const course = this.selectedCourseForDocs();
      if (!course) return;
      this.apiService.delete<any>(`/e-documentos/${config.id}`).subscribe({
        next: () => {
          this.alert.success('Configuración eliminada con éxito.');
          this.resetDocsForm(this.docsForm().TipoAsistente);
          this.loadCourseDocsConfig(course.id, false);
        },
        error: (err) => { this.alert.error('Error al eliminar la configuración', err?.error?.message || 'Error de servidor'); }
      });
    });
  }
}
