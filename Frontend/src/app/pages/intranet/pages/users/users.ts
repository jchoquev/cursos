import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlatformService, UserItem } from '../../../../services/platform.service';
import { ApiService } from '../../../../services/api.service';
import { DnaLoaderService } from '../../../../services/dna-loader.service';
import { AlertService } from '../../../../services/alert.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
})
export class UsersComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly apiService = inject(ApiService);
  private readonly dnaLoader = inject(DnaLoaderService);
  private readonly alert = inject(AlertService);

  showUserModal = signal<boolean>(false);
  isEditing = signal<boolean>(false);
  savingUser = signal<boolean>(false);
  saveUserError = signal<string>('');
  originalUserEmail = signal<string>('');

  userForm = signal<{
    email: string; name: string; role: UserItem['role']; dni: string; password: string;
  }>({ email: '', name: '', role: 'Caja', dni: '', password: '' });

  ngOnInit(): void {
    this.platformService.loadUsers();
  }

  userSearchQuery = signal<string>('');
  userSortColumn = signal<string>('name');
  userSortDirection = signal<'asc' | 'desc'>('asc');
  userCurrentPage = signal<number>(1);
  userPageSize = signal<number>(5);

  readonly filteredAndPaginatedUsers = computed(() => {
    const query = this.userSearchQuery().toLowerCase().trim();
    const sortCol = this.userSortColumn();
    const sortDir = this.userSortDirection();
    const page = this.userCurrentPage();
    const size = this.userPageSize();
    let list = [...this.platformService.users()];
    if (query) {
      list = list.filter(u =>
        u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query) ||
        u.dni.includes(query) || u.role.toLowerCase().includes(query)
      );
    }
    list.sort((a: any, b: any) => {
      const valA = a[sortCol] || ''; const valB = b[sortCol] || '';
      return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });
    const start = (page - 1) * size;
    return { items: list.slice(start, start + size), totalItems: list.length, totalPages: Math.ceil(list.length / size) || 1 };
  });

  changeUserSort(column: string): void {
    if (this.userSortColumn() === column) { this.userSortDirection.update(d => d === 'asc' ? 'desc' : 'asc'); }
    else { this.userSortColumn.set(column); this.userSortDirection.set('asc'); }
    this.userCurrentPage.set(1);
  }

  getPagesArray(totalPages: number): number[] { return Array.from({ length: totalPages }, (_, i) => i + 1); }
  getMinRecord(page: number, size: number, total: number): number { return Math.min(page * size, total); }

  openAddUser(): void {
    this.isEditing.set(false); this.savingUser.set(false); this.saveUserError.set('');
    this.userForm.set({ email: '', name: '', role: 'Caja', dni: '', password: '' });
    this.showUserModal.set(true);
  }

  openEditUser(user: UserItem): void {
    this.isEditing.set(true); this.savingUser.set(false); this.saveUserError.set('');
    this.originalUserEmail.set(user.email);
    this.userForm.set({ email: user.email, name: user.name, role: user.role, dni: user.dni, password: user.password || 'part123' });
    this.showUserModal.set(true);
  }

  saveUser(): void {
    const form = this.userForm();
    if (!form.email || !form.name || !form.dni) return;
    this.savingUser.set(true); this.saveUserError.set('');
    this.dnaLoader.show('Guardando Usuario', this.isEditing() ? 'Actualizando datos del usuario...' : 'Registrando nuevo usuario...');
    if (this.isEditing()) {
      const updatedUser: UserItem = { email: form.email, name: form.name, role: form.role, dni: form.dni, password: form.password };
      this.platformService.editUser(updatedUser, this.originalUserEmail()).subscribe({
        next: () => { this.savingUser.set(false); this.dnaLoader.hide(); this.showUserModal.set(false); this.alert.success('Datos de usuario actualizados correctamente.'); },
        error: (err) => { this.savingUser.set(false); this.dnaLoader.hide(); this.saveUserError.set(err?.error?.message || 'Error al actualizar el usuario.'); }
      });
    } else {
      const autoPassword = this.generateSecurePassword();
      const newUser: UserItem = { email: form.email, name: form.name, role: form.role, dni: form.dni, password: autoPassword };
      this.platformService.addUser(newUser).subscribe({
        next: () => { this.savingUser.set(false); this.dnaLoader.hide(); this.showUserModal.set(false); this.alert.success(`Usuario registrado. Se ha enviado un correo a ${newUser.email} con las credenciales de acceso.`); },
        error: (err) => { this.savingUser.set(false); this.dnaLoader.hide(); this.saveUserError.set(err?.error?.message || 'Error al registrar el usuario.'); }
      });
    }
  }

  private generateSecurePassword(): string {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  deleteUser(email: string): void {
    this.alert.confirmDanger('¿Está seguro de eliminar a este usuario?', 'Se cancelarán también todas sus inscripciones vinculadas.').then(ok => {
      if (!ok) return;
      this.platformService.deleteUser(email);
    });
  }
}
