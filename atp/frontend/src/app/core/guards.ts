import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const a = inject(AuthService);
  return a.loggedIn ? true : inject(Router).createUrlTree(['/login']);
};
export const guestGuard: CanActivateFn = () => {
  const a = inject(AuthService);
  return a.loggedIn ? inject(Router).createUrlTree(['/atp']) : true;
};
