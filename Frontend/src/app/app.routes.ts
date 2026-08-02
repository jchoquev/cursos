import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SearchCertificates } from './pages/search-certificates/search-certificates';
import { inject } from '@angular/core';
import { Router, CanActivateChildFn } from '@angular/router';
import { PlatformService } from './services/platform.service';

export const intranetGuard: CanActivateChildFn = (route, state) => {
  const platformService = inject(PlatformService);
  const router = inject(Router);

  const isLoginPath = state.url.split('?')[0] === '/intranet/login';

  if (platformService.isLoggedIn()) {
    if (isLoginPath) {
      // Si el guard llegó al login durante la restauración de sesión,
      // conserva la sección que el usuario había solicitado originalmente.
      const returnUrl = new URLSearchParams(state.url.split('?')[1] || '').get('returnUrl');
      if (returnUrl?.startsWith('/intranet/') && returnUrl !== '/intranet/login') {
        return router.parseUrl(returnUrl);
      }
      return router.createUrlTree(['/intranet/overview']);
    }
    return true;
  } else {
    if (isLoginPath) {
      return true;
    }
    // Conserva la ruta solicitada para volver allí después del login.
    return router.createUrlTree(['/intranet/login'], {
      queryParams: { returnUrl: state.url },
    });
  }
};

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'buscar-certificados', component: SearchCertificates },
  {
    path: 'intranet',
    canActivateChild: [intranetGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./pages/intranet/pages/login/login').then(m => m.LoginComponent),
      },
      {
        path: '',
        loadComponent: () => import('./pages/intranet/intranet-shell').then(m => m.IntranetShellComponent),
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          { path: 'overview', loadComponent: () => import('./pages/intranet/pages/overview/overview').then(m => m.OverviewComponent) },
          { path: 'users', loadComponent: () => import('./pages/intranet/pages/users/users').then(m => m.UsersComponent) },
          { path: 'courses', loadComponent: () => import('./pages/intranet/pages/courses/courses').then(m => m.CoursesComponent) },
          { path: 'registrations', loadComponent: () => import('./pages/intranet/pages/registrations/registrations').then(m => m.RegistrationsComponent) },
          { path: 'certificates', loadComponent: () => import('./pages/intranet/pages/certificates/certificates').then(m => m.CertificatesComponent) },
          { path: 'attendance', loadComponent: () => import('./pages/intranet/pages/attendance/attendance').then(m => m.AttendanceComponent) },
          { path: 'my-courses', loadComponent: () => import('./pages/intranet/pages/my-courses/my-courses').then(m => m.MyCoursesComponent) },
          { path: 'my-registrations', loadComponent: () => import('./pages/intranet/pages/my-registrations/my-registrations').then(m => m.MyRegistrationsComponent) },
          { path: 'my-certificates', loadComponent: () => import('./pages/intranet/pages/my-certificates/my-certificates').then(m => m.MyCertificatesComponent) },
          { path: 'projects', loadComponent: () => import('./pages/intranet/pages/projects/projects').then(m => m.ProjectsComponent) },
          { path: 'inv-lineas', loadComponent: () => import('./pages/intranet/pages/inv-lineas/inv-lineas').then(m => m.InvLineasComponent) },
          { path: 'register-events', loadComponent: () => import('./pages/intranet/pages/register-events/register-events').then(m => m.RegisterEventsComponent) },
          { path: 'internal-data', loadComponent: () => import('./pages/intranet/pages/internal-data/internal-data').then(m => m.InternalDataComponent) },
          { path: 'periodo-aca', loadComponent: () => import('./pages/intranet/pages/periodo-aca/periodo-aca').then(m => m.PeriodoAcaComponent) },
        ]
      }
    ]
  },
  { path: '**', redirectTo: '' },
];
