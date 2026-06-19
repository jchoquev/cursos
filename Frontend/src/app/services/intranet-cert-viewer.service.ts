import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class IntranetCertViewerService {
  certFondoBase64 = signal<string | null>(null);
  certDocData = signal<any | null>(null);
  showCertWithBackground = signal<boolean>(false);
  certParticipantData = signal<any | null>(null);
  showPrintCertModal = signal<boolean>(false);
  showResolutionModal = signal<boolean>(false);
}
