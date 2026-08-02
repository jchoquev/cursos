import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformService } from '../../../../services/platform.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: '../../intranet.css',
})
export class LoginComponent implements OnInit {
  readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  emailInput = signal<string>('');
  passwordInput = signal<string>('');
  loginError = signal<string>('');
  isLoggingIn = signal<boolean>(false);

  ngOnInit(): void {
    // Evita mostrar el formulario si el usuario ya tiene una sesión activa.
    if (this.platformService.isLoggedIn()) {
      this.navigateToDefaultSection();
    }
  }

  handleLogin(): void {
    this.loginError.set('');
    this.isLoggingIn.set(true);
    this.platformService.login(this.emailInput(), this.passwordInput()).subscribe({
      next: (success) => {
        this.isLoggingIn.set(false);
        if (success) {
          this.emailInput.set('');
          this.passwordInput.set('');
          this.navigateToDefaultSection();
        } else {
          this.loginError.set(
            this.platformService.errorMessage() || 'Credenciales incorrectas. Intente nuevamente.'
          );
        }
      },
      error: () => {
        this.isLoggingIn.set(false);
        this.loginError.set('Error al conectar con el servidor. Intente más tarde.');
      },
    });
  }

  quickLogin(role: 'admin' | 'caja' | 'formacion' | 'investigacion'): void {
    this.loginError.set('');
    this.isLoggingIn.set(true);
    let email = '';
    let password = '';
    if (role === 'admin') { email = 'admin@institucion.edu'; password = 'admin123'; }
    else if (role === 'caja') { email = 'caja@institucion.edu'; password = 'caja123'; }
    else if (role === 'formacion') { email = 'formacion@institucion.edu'; password = 'formacion123'; }
    else if (role === 'investigacion') { email = 'investigacion@institucion.edu'; password = 'investigacion123'; }

    this.platformService.login(email, password).subscribe({
      next: (success) => {
        this.isLoggingIn.set(false);
        if (success) {
          this.navigateToDefaultSection();
        } else {
          this.loginError.set('Error al realizar el login rápido.');
        }
      },
      error: () => {
        this.isLoggingIn.set(false);
        this.loginError.set('Error al realizar el login rápido.');
      }
    });
  }

  navigateToDefaultSection(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/intranet/') && returnUrl !== '/intranet/login') {
      this.router.navigateByUrl(returnUrl);
      return;
    }

    const role = this.platformService.userRole();
    if (role === 'Administrador') {
      this.router.navigate(['/intranet/overview']);
    } else if (role === 'Caja') {
      this.router.navigate(['/intranet/registrations']);
    } else if (role === 'Formación Continua') {
      this.router.navigate(['/intranet/courses']);
    } else if (role === 'Investigación') {
      this.router.navigate(['/intranet/projects']);
    } else {
      this.router.navigate(['/intranet/overview']);
    }
  }
}
