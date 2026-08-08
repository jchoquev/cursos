import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Paginación reutilizable para las tablas de la intranet.
 * Mantiene los estados visuales en un único lugar para los temas claro y oscuro.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly itemLabel = input('registros');
  readonly pageChange = output<number>();

  readonly firstItem = computed(() => this.totalItems() ? (this.page() - 1) * this.pageSize() + 1 : 0);
  readonly lastItem = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));
  readonly pages = computed(() => Array.from({ length: this.totalPages() }, (_, index) => index + 1));

  goTo(page: number): void {
    if (page >= 1 && page <= this.totalPages() && page !== this.page()) this.pageChange.emit(page);
  }
}
