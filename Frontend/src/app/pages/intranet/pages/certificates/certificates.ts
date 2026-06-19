import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, Registration } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { IntranetCertViewerService } from '../../../../services/intranet-cert-viewer.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { DnaLoaderComponent } from '../../../../components/dna-loader/dna-loader';
import { PeriodoAca } from '../periodo-aca/periodo-aca';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, FormsModule, DnaLoaderComponent],
  templateUrl: './certificates.html',
})
export class CertificatesComponent implements OnInit, OnDestroy {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly certViewer = inject(IntranetCertViewerService);
  readonly dnaLoader = inject(DnaLoaderService);
  private readonly alert = inject(AlertService);

  academicPeriods = signal<PeriodoAca[]>([]);
  tempCertFilterPeriodId = signal<string>('');
  tempCertFilterEventId = signal<string>('');
  tempCertSearchQuery = signal<string>('');
  activeCertFilterPeriodId = signal<string>('');
  activeCertFilterEventId = signal<string>('');
  activeCertSearchQuery = signal<string>('');
  certSortColumn = signal<string>('date');
  certSortDirection = signal<'asc' | 'desc'>('desc');
  certCurrentPage = signal<number>(1);
  certPageSize = signal<number>(5);

  availableEvents = signal<any[]>([]);

  readonly filteredAndPaginatedCertificates = computed(() => {
    const periodId = this.activeCertFilterPeriodId();
    const eventId = this.activeCertFilterEventId();
    const query = this.activeCertSearchQuery().toLowerCase().trim();
    const sortCol = this.certSortColumn();
    const sortDir = this.certSortDirection();
    const page = this.certCurrentPage();
    const size = this.certPageSize();
    let list = [...this.platformService.registrations().filter(r => r.isPaymentValidated)];
    if (periodId) {
      const periodEventIds = new Set(
        this.availableEvents().map(e => String(e.id))
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

  applyCertificateFilters(): void {
    this.activeCertFilterPeriodId.set(this.tempCertFilterPeriodId());
    this.activeCertFilterEventId.set(this.tempCertFilterEventId());
    this.activeCertSearchQuery.set(this.tempCertSearchQuery());
    this.certCurrentPage.set(1);
  }

  onPeriodChange(periodId: string): void {
    this.tempCertFilterPeriodId.set(periodId);
    this.tempCertFilterEventId.set('');
    this.applyCertificateFilters();
    this.loadEventsForPeriod(periodId);
  }

  loadEventsForPeriod(periodId: string): void {
    const params = periodId ? { periodo_id: periodId } : {};
    this.apiService.get<any[]>('/eventos', params).subscribe({
      next: (events) => {
        if (Array.isArray(events)) {
          const mapped = events
            .map(item => this.platformService.mapBackendEventoToEventItem(item))
            .filter(ev => ev.type !== 'Repositorio');
          this.availableEvents.set(mapped);
        } else {
          this.availableEvents.set([]);
        }
      },
      error: () => this.availableEvents.set([])
    });
  }

  changeCertSort(column: string): void {
    if (this.certSortColumn() === column) { this.certSortDirection.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.certSortColumn.set(column); this.certSortDirection.set('asc'); }
    this.certCurrentPage.set(1);
  }

  getPagesArray(n: number): number[] { return Array.from({ length: n }, (_, i) => i + 1); }
  getMinRecord(page: number, size: number, total: number): number { return Math.min(page * size, total); }

  ngOnInit(): void {
    this.platformService.loadRegistrations();
    this.platformService.loadEvents();
    this.loadPeriods();
  }

  loadPeriods(): void {
    this.apiService.get<PeriodoAca[]>('/periodo-aca').subscribe({
      next: (periods) => {
        if (Array.isArray(periods)) {
          this.academicPeriods.set(periods);
          const active = periods.find(p => p.Activo) || periods[0];
          if (active) {
            const activeId = String(active.Id);
            this.tempCertFilterPeriodId.set(activeId);
            this.activeCertFilterPeriodId.set(activeId);
            this.loadEventsForPeriod(activeId);
          }
        }
      }
    });
  }

  ngOnDestroy(): void {}

  hasCertificate(reg: Registration): boolean {
    return this.platformService.certificates().some(c => c.dni === reg.userDni && c.eventId === reg.eventId);
  }

  issueCert(registrationId: any): void {
    this.alert.confirmDanger('¿Emitir el certificado para este participante?', undefined, 'Emitir').then(ok => {
      if (!ok) return;
      this.dnaLoader.show('Emitiendo Certificado', 'Generando documento oficial...');
      this.apiService.post<any>('/certificados', { inscripcion_id: registrationId }).subscribe({
        next: (resp) => {
          this.dnaLoader.hide();
          this.alert.success('Certificado emitido. Código: ' + (resp.data?.CodigoCertificado || ''));
          this.platformService.loadRegistrations(true);
        },
        error: (err) => {
          this.dnaLoader.hide();
          this.alert.error('Error al emitir', err?.error?.message || 'Error de servidor');
        }
      });
    });
  }

  viewAndDownload(reg: Registration): void {
    if (!reg.documentCode) { this.alert.error('Este participante no tiene código de certificado.'); return; }
    const tipoAsistenteId = reg.tipoAsistenteId ?? 1;
    const participantData = {
      code: reg.documentCode, fullName: reg.userName, dni: reg.userDni,
      eventId: reg.eventId, eventTitle: reg.eventTitle, issueDate: reg.date,
      tipoAsistente: reg.tipoAsistente || 'ASISTENTE', hours: 150
    };
    this.dnaLoader.show('Verificando Documento', 'Consultando plantilla del certificado...');

    this.apiService.get<any>('/e-documentos/fondo-base64', {
      evento_id: reg.eventId, tipo_asistente: tipoAsistenteId
    }).subscribe({
      next: (resp) => {
        this.dnaLoader.hide();
        if (resp?.status !== 'success') {
          this.alert.noDocument(reg.tipoAsistente || 'ASISTENTE');
          return;
        }
        this.certViewer.certFondoBase64.set(resp.fondo_base64);
        this.certViewer.certDocData.set(resp.e_documento);
        this.certViewer.certParticipantData.set(participantData);
        this.certViewer.showCertWithBackground.set(true);
      },
      error: (err) => {
        this.dnaLoader.hide();
        const isNotFound = err?.status === 404 || err?.error?.message?.toLowerCase().includes('no se encontró');
        if (isNotFound) {
          this.alert.noDocument(reg.tipoAsistente || 'ASISTENTE');
        } else {
          this.alert.error('Error al consultar el documento', err?.error?.message || 'Error del servidor.');
        }
      }
    });
  }

  // ---- UPLOAD SCANNED PDF ----
  showUploadModal = signal<boolean>(false);
  uploadTargetReg = signal<Registration | null>(null);
  uploadSelectedFile = signal<File | null>(null);
  uploadingPdf = signal<boolean>(false);
  uploadError = signal<string>('');
  uploadSuccess = signal<string>('');

  openUploadModal(reg: Registration): void {
    this.uploadTargetReg.set(reg);
    this.uploadSelectedFile.set(null);
    this.uploadError.set('');
    this.uploadSuccess.set('');
    this.showUploadModal.set(true);
  }

  closeUploadModal(): void {
    this.showUploadModal.set(false);
    this.uploadTargetReg.set(null);
    this.uploadSelectedFile.set(null);
    this.uploadError.set('');
    this.uploadSuccess.set('');
  }

  onPdfFileSelected(event: any): void {
    const file: File | undefined = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      this.uploadError.set('Solo se permiten archivos PDF.');
      this.uploadSelectedFile.set(null);
      return;
    }
    this.uploadError.set('');
    this.uploadSelectedFile.set(file);
  }

  submitPdfUpload(): void {
    const reg = this.uploadTargetReg();
    const file = this.uploadSelectedFile();
    if (!reg || !file) return;
    const formData = new FormData();
    formData.append('pdf', file);
    this.uploadingPdf.set(true);
    this.uploadError.set('');
    this.uploadSuccess.set('');
    this.apiService.postFormData<any>(`/inscripciones/${reg.id}/upload-pdf-escaneado`, formData).subscribe({
      next: () => {
        this.uploadingPdf.set(false);
        this.uploadSuccess.set('✅ PDF subido correctamente al servidor.');
        this.uploadSelectedFile.set(null);
        this.platformService.loadRegistrations(true);
      },
      error: (err) => {
        this.uploadingPdf.set(false);
        this.uploadError.set('❌ Error al subir: ' + (err?.error?.message || 'Error del servidor.'));
      }
    });
  }
}
