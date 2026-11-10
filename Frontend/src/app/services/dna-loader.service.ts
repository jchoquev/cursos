import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DnaLoaderService {
  readonly visible  = signal(false);
  readonly title    = signal('Procesando');
  readonly message  = signal('Por favor espere...');
  readonly anniversaryVisible = signal(false);
  readonly sliderReady = signal(true);
  private anniversaryShown = false;

  show(title = 'Procesando', message = 'Por favor espere...'): void {
    this.title.set(title);
    this.message.set(message);
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }

  startSliderLoading(): void {
    this.sliderReady.set(false);
  }

  finishSliderLoading(celebrate = false): void {
    if (this.sliderReady()) return;
    this.sliderReady.set(true);
    if (celebrate) this.showAnniversaryOnce();
  }

  /** La celebración sale una vez por sesión del navegador, no en cada recarga. */
  private showAnniversaryOnce(): void {
    if (this.anniversaryShown) return;
    this.anniversaryShown = true;

    try {
      if (sessionStorage.getItem('anniversary_shown')) return;
      sessionStorage.setItem('anniversary_shown', '1');
    } catch {
      // Sin sessionStorage se limita a una vez por carga de la app.
    }

    this.anniversaryVisible.set(true);
    setTimeout(() => this.anniversaryVisible.set(false), 2500);
  }
}
