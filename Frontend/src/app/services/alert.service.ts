import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import Swal, { SweetAlertResult } from 'sweetalert2';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly router = inject(Router);

  private readonly baseConfig = {
    background: '#0f172a',
    color: '#f1f5f9',
    confirmButtonColor: '#10b981',
    cancelButtonColor: '#6b7280',
    customClass: {
      popup: 'lp-swal-popup',
      confirmButton: 'lp-swal-confirm',
      cancelButton: 'lp-swal-cancel',
      title: 'lp-swal-title',
      htmlContainer: 'lp-swal-html',
    },
  };

  success(title: string, text?: string): void {
    Swal.fire({
      ...this.baseConfig,
      icon: 'success',
      title,
      text,
      timer: 2800,
      timerProgressBar: true,
      showConfirmButton: false,
    });
  }

  error(title: string, text?: string): void {
    Swal.fire({
      ...this.baseConfig,
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#e11d48',
    });
  }

  warning(title: string, text?: string): void {
    Swal.fire({
      ...this.baseConfig,
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#f59e0b',
    });
  }

  info(title: string, text?: string): void {
    Swal.fire({
      ...this.baseConfig,
      icon: 'info',
      title,
      text,
      confirmButtonText: 'Aceptar',
    });
  }

  async confirm(title: string, text?: string, confirmText = 'Confirmar', icon: 'warning' | 'question' = 'warning'): Promise<boolean> {
    const result: SweetAlertResult = await Swal.fire({
      ...this.baseConfig,
      icon,
      title,
      text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      reverseButtons: true,
    });
    return result.isConfirmed;
  }

  async confirmDanger(title: string, text?: string, confirmText = 'Eliminar'): Promise<boolean> {
    return this.confirm(title, text, confirmText, 'warning');
  }

  noDocument(tipoAsistente: string): void {
    Swal.fire({
      ...this.baseConfig,
      icon: 'warning',
      title: 'Documento no configurado',
      html: `No se encontró un documento base para el tipo de participante <strong>"${tipoAsistente}"</strong> en este evento.<br><br>configúralo en gestión de eventos`,
      showCancelButton: true,
      confirmButtonText: 'Ir',
      cancelButtonText: 'Entendido',
      confirmButtonColor: '#b45309',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
    }).then((result) => {
      if (result.isConfirmed) {
        this.router.navigate(['/intranet/courses']);
      }
    });
  }
}
