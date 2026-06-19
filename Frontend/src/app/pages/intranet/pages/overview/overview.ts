import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PlatformService } from '../../../../services/platform.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './overview.html',
})
export class OverviewComponent implements OnInit {
  readonly platformService = inject(PlatformService);

  ngOnInit(): void {
    this.platformService.loadEvents();
    this.platformService.loadRegistrations();
  }

  readonly stats = computed(() => {
    const evs = this.platformService.events();
    const regs = this.platformService.registrations();
    const certs = this.platformService.certificates();
    const usrs = this.platformService.users();
    const pendingRegs = regs.filter(r => !r.isPaymentValidated).length;
    const activeEvents = evs.filter(e => e.status === 'activo').length;
    const totalAttendances = this.platformService.attendances().length;
    let attendPercent = 88;
    if (totalAttendances > 0) {
      const records = this.platformService.attendances().map(a => Object.values(a.records)).flat();
      const present = records.filter(r => r === true).length;
      attendPercent = records.length > 0 ? Math.round((present / records.length) * 100) : 88;
    }
    return {
      totalEvents: evs.length, activeEvents,
      totalUsers: usrs.length, totalRegistrations: regs.length,
      pendingRegistrations: pendingRegs, totalCertificates: certs.length,
      attendanceRate: attendPercent,
    };
  });
}
