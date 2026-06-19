import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService } from '../../../../services/platform.service';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
})
export class AttendanceComponent implements OnInit {
  readonly platformService = inject(PlatformService);

  selectedAttendanceEvent = signal<number>(0);
  selectedAttendanceDate = signal<string>(new Date().toISOString().split('T')[0]);

  readonly registeredStudentsForSelectedEvent = computed(() => {
    const eventId = this.selectedAttendanceEvent();
    if (!eventId) return [];
    return this.platformService.registrations().filter(r => r.eventId === eventId && r.status === 'Aprobado');
  });

  ngOnInit(): void {
    this.platformService.loadEvents();
    this.platformService.loadRegistrations();
  }

  isStudentAttendant(studentEmail: string): boolean {
    const eventId = this.selectedAttendanceEvent();
    const date = this.selectedAttendanceDate();
    const record = this.platformService.attendances().find(a => a.eventId === eventId && a.sessionDate === date);
    return record?.records[studentEmail] === true;
  }

  toggleAttendance(studentEmail: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.platformService.checkAttendance(this.selectedAttendanceEvent(), this.selectedAttendanceDate(), studentEmail, checked);
  }
}
