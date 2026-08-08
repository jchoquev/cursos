import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DnaLoaderService {
  readonly visible  = signal(false);
  readonly title    = signal('Procesando');
  readonly message  = signal('Por favor espere...');
  readonly anniversaryVisible = signal(false);
  private anniversaryShown = false;
  private anniversaryTimer: ReturnType<typeof setTimeout> | null = null;

  show(title = 'Procesando', message = 'Por favor espere...'): void {
    this.title.set(title);
    this.message.set(message);
    this.visible.set(true);
  }

  hide(): void {
    const wasVisible = this.visible();
    this.visible.set(false);

    // La celebración se muestra una sola vez, al terminar la carga inicial.
    if (wasVisible && !this.anniversaryShown) {
      this.anniversaryShown = true;
      this.anniversaryVisible.set(true);
      this.anniversaryTimer = setTimeout(() => {
        this.anniversaryVisible.set(false);
        this.anniversaryTimer = null;
      }, 5000);
    }
  }
}
