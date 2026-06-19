import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DnaLoaderService {
  readonly visible  = signal(false);
  readonly title    = signal('Procesando');
  readonly message  = signal('Por favor espere...');

  show(title = 'Procesando', message = 'Por favor espere...'): void {
    this.title.set(title);
    this.message.set(message);
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }
}
