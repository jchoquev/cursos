import { Injectable, signal } from '@angular/core';
import { Registration } from './platform.service';

@Injectable({ providedIn: 'root' })
export class IntranetPaymentService {
  showPaymentModal = signal<boolean>(false);
  selectedRegistration = signal<Registration | null>(null);

  open(reg: Registration): void {
    this.selectedRegistration.set(reg);
    this.showPaymentModal.set(true);
  }

  close(): void {
    this.showPaymentModal.set(false);
    this.selectedRegistration.set(null);
  }
}
