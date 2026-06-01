import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { SearchCertificates } from './pages/search-certificates/search-certificates';
import { IntranetComponent } from './pages/intranet/intranet';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'buscar-certificados', component: SearchCertificates },
  { path: 'intranet', component: IntranetComponent },
  { path: '**', redirectTo: '' },
];
