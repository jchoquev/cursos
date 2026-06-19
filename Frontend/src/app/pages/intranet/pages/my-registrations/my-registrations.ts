import { Component, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlatformService } from '../../../../services/platform.service';

@Component({
  selector: 'app-my-registrations',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-registrations.html',
})
export class MyRegistrationsComponent implements OnInit {
  readonly platformService = inject(PlatformService);

  ngOnInit(): void {
    this.platformService.loadRegistrations();
  }

  readonly myRegistrations = computed(() => {
    const user = this.platformService.currentUser();
    if (!user) return [];
    return this.platformService.registrations().filter(r => r.userEmail === user.email);
  });
}
