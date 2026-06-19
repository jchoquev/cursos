import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService } from '../../../../services/platform.service';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-register-events',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-events.html',
})
export class RegisterEventsComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly alert = inject(AlertService);

  ngOnInit(): void {
    this.platformService.loadEvents();
    this.platformService.loadRegistrations();
  }

  private readonly myRegistrations = computed(() => {
    const user = this.platformService.currentUser();
    if (!user) return [];
    return this.platformService.registrations().filter(r => r.userEmail === user.email);
  });

  readonly upcomingEventsForParticipant = computed(() => {
    const myRegs = this.myRegistrations();
    return this.platformService.events().filter(
      e => e.status === 'activo' && e.type !== 'Repositorio' && !myRegs.some(r => r.eventId === e.id)
    );
  });

  registerQuicklyToEvent(eventId: number): void {
    const user = this.platformService.currentUser();
    if (!user) return;
    const res = this.platformService.registerToEvent(user.dni, user.name, user.email, eventId);
    this.alert.info('Información', res.message);
  }
}
