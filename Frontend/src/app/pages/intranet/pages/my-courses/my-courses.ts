import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlatformService } from '../../../../services/platform.service';

@Component({
  selector: 'app-my-courses',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-courses.html',
})
export class MyCoursesComponent {
  readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);

  goToAttendance(eventId: number): void {
    this.router.navigate(['/intranet/attendance'], { queryParams: { eventId } });
  }

  goToCertificates(): void {
    this.router.navigate(['/intranet/certificates']);
  }
}
