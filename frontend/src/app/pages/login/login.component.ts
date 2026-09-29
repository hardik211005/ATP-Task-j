import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/icon/icon.component';

type Mode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  mode: Mode = 'login';
  show = false; err = ''; info = ''; busy = false;

  // login
  u = ''; p = '';
  // sign up
  sn = ''; su = ''; sp = ''; sc = '';
  // reset password
  reset = false; ru = ''; rc = ''; rn = ''; msg = ''; ok = false;

  go(m: Mode) {
    this.mode = m; this.err = ''; this.info = ''; this.show = false; this.busy = false;
  }

  openReset() {
    this.ru = this.u; this.rc = ''; this.rn = ''; this.msg = ''; this.ok = false;
    this.reset = true;
  }

  submit() {
    if (!this.u.trim() || !this.p) { this.err = 'Enter your username and password.'; return; }
    this.busy = true;
    this.auth.login(this.u.trim(), this.p).subscribe({
      next: () => this.router.navigateByUrl('/atp'),
      error: (e) => {
        this.busy = false;
        this.err = e.status === 401 ? 'Username or password is incorrect.' : 'Cannot reach the server. Is the backend running?';
      },
    });
  }

  signup() {
    const name = this.sn.trim(), user = this.su.trim();
    if (name.length < 2) { this.err = 'Enter your full name.'; return; }
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(user)) { this.err = 'Username must be 3 to 32 characters: letters, numbers, dot, dash or underscore.'; return; }
    if (this.sp.length < 6) { this.err = 'Password must be at least 6 characters.'; return; }
    if (this.sp !== this.sc) { this.err = 'Passwords do not match.'; return; }
    this.busy = true;
    this.auth.register(name, user, this.sp).subscribe({
      next: () => {
        this.u = user; this.p = '';
        this.go('login');
        this.info = 'Account created. Please log in.';
      },
      error: (e) => {
        this.busy = false;
        if (e.status === 409) this.err = 'That username is taken.';
        else if (e.status === 0) this.err = 'Cannot reach the server. Is the backend running?';
        else this.err = typeof e.error?.detail === 'string' ? e.error.detail : 'Could not create the account. Check your details.';
      },
    });
  }

  doReset() {
    if (this.rn.length < 6) { this.ok = false; this.msg = 'Password must be at least 6 characters.'; return; }
    this.auth.resetPassword(this.ru, this.rc, this.rn).subscribe({
      next: () => { this.ok = true; this.msg = 'Password updated. You can log in now.'; },
      error: (e) => { this.ok = false; this.msg = e.error?.detail || 'Could not reset the password.'; },
    });
  }
}