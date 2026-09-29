import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards';
import { LoginComponent } from './pages/login/login.component';
import { LayoutComponent } from './layout/layout.component';
import { AtpComponent } from './pages/atp/atp.component';
import { UsersComponent } from './pages/users/users.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [guestGuard] },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: 'atp', component: AtpComponent },
      { path: 'users', component: UsersComponent },
      { path: '', pathMatch: 'full', redirectTo: 'atp' },
    ],
  },
  { path: '**', redirectTo: '' },
];
