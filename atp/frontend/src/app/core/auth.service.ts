import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { User } from './models';

const TOKEN = 'atp11b_token';
const USER = 'atp11b_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  user = signal<User | null>(JSON.parse(localStorage.getItem(USER) || 'null'));

  get token() { return localStorage.getItem(TOKEN); }
  get loggedIn() { return !!this.token && !!this.user(); }

  login(username: string, password: string) {
    return this.http.post<{ token: string; user: User }>('/api/auth/login', { username, password }).pipe(
      tap((r) => {
        localStorage.setItem(TOKEN, r.token);
        localStorage.setItem(USER, JSON.stringify(r.user));
        this.user.set(r.user);
      }),
    );
  }
  register(name: string, username: string, password: string) {
    return this.http.post<User>('/api/auth/register', { name, username, password });
  }
  resetPassword(username: string, current_password: string, new_password: string) {
    return this.http.post('/api/auth/reset-password', { username, current_password, new_password });
  }
  logout() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(USER);
    this.user.set(null);
    this.router.navigateByUrl('/login');
  }
}
