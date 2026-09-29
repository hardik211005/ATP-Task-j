import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { IconComponent } from '../../shared/ui';

type Mode = 'login' | 'signup';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent],
  styles: [`
    :host { display: block; height: 100%; }
    .lg { position: relative; height: 100%; overflow: hidden; font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: linear-gradient(135deg, #ffffff 0%, #eef1fb 55%, #e4e9fa 100%); }
    .lg-art { position: absolute; inset: 0; clip-path: url(#lgClip);
      background: #2229c9 url('/login-bg.jpg') no-repeat -50px top / auto 100%; }
    .lg-panel { position: absolute; top: 0; right: 0; bottom: 0; left: 62%; display: flex; overflow-y: auto; }
    .lg-card { width: min(400px, 88%); margin: auto; padding: 28px 0; }
    .lg-logo { width: 74px; height: 74px; display: block; }
    .lg-product { color: #2b35d0; font-size: 27px; line-height: 1.25; font-weight: 800; letter-spacing: -.4px; margin: 18px 0 38px; }
    .lg-title { font-size: 35px; font-weight: 800; color: #05071a; margin: 0 0 8px; letter-spacing: -.8px; line-height: 1.1; }
    .lg-sub { font-size: 16px; font-weight: 600; color: #1a1d33; margin: 0 0 10px; letter-spacing: -.1px; }
    .lg-card label { font-size: 15px; font-weight: 700; color: #0a0d24; margin: 20px 0 8px; }
    .lg-card .field { height: 48px; font-size: 15px; font-weight: 600; color: #0a0d24; border-color: #d3d8ec; background: #fdfdff; }
    .lg-card .field.pw input { font-weight: 600; font-size: 15px; }
    .lg-card .field:-webkit-autofill,
    .lg-card .field input:-webkit-autofill { -webkit-box-shadow: 0 0 0 100px #fdfdff inset; -webkit-text-fill-color: #0a0d24; }
    .lg-link { color: #2b35d0; font-weight: 700; font-size: 15px; background: none; padding: 0; }
    .lg-link:hover { text-decoration: underline; }
    .lg-forgot { display: block; margin: 14px 0 24px auto; }
    .lg-btn { width: 100%; height: 50px; border-radius: 8px; color: #fff; font-size: 17px; font-weight: 700; letter-spacing: .2px;
      background: linear-gradient(180deg, #3a45e6, #2b35d0); box-shadow: 0 3px 10px rgba(43,53,208,.35); transition: background .15s; }
    .lg-btn:hover:not(:disabled) { background: #1d24b8; }
    .lg-btn:disabled { opacity: .55; cursor: not-allowed; }
    .lg-switch { text-align: center; font-size: 15px; font-weight: 600; color: #2c3049; margin: 22px 0 0; }
    .lg-card .err, .lg-card .ok { font-size: 14px; font-weight: 600; margin: 12px 0 0; }
    .lg-card .ok { margin: 0 0 4px; }
    .lg-card .hint { font-size: 12.5px; color: #5b6078; font-weight: 500; margin: 6px 0 0; }
    .lg-clip-svg { position: absolute; width: 0; height: 0; }
    @media (max-width: 900px) {
      .lg-art { display: none; }
      .lg-panel { left: 0; }
      .lg-card { width: min(400px, 88%); }
    }
  `],
  template: `
    <div class="lg">
      <svg class="lg-clip-svg" aria-hidden="true">
        <defs>
          <clipPath id="lgClip" clipPathUnits="objectBoundingBox">
            <path d="M0,0 L0.575,0 C0.63,0.22 0.62,0.55 0.38,1 L0,1 Z" />
          </clipPath>
        </defs>
      </svg>

      <div class="lg-art" role="img" aria-label="5G tower over India network map"></div>

      <div class="lg-panel">
        @if (mode === 'login') {
          <form class="lg-card" (ngSubmit)="submit()">
            <img class="lg-logo" src="/jio-logo.png" alt="Jio" />
            <h2 class="lg-product">5G Site Planning and Engineering Product</h2>
            <h3 class="lg-title">Welcome</h3>
            <p class="lg-sub">Please log in to continue your journey!</p>
            @if (info) { <div class="ok">{{ info }}</div> }

            <label for="u">Username</label>
            <input id="u" class="field" name="u" [(ngModel)]="u" (ngModelChange)="err = ''" autocomplete="username" />

            <label for="p">Password</label>
            <div class="field pw">
              <input id="p" name="p" [type]="show ? 'text' : 'password'" [(ngModel)]="p" (ngModelChange)="err = ''" autocomplete="current-password" />
              <button type="button" class="icon-btn plain" (click)="show = !show" aria-label="Show password"><app-icon [name]="show ? 'eyeoff' : 'eye'" /></button>
            </div>
            <button type="button" class="lg-link lg-forgot" (click)="openReset()">Reset Password</button>

            @if (err) { <div class="err" style="margin:0 0 12px">{{ err }}</div> }
            <button class="lg-btn" type="submit" [disabled]="busy">Login</button>
            <p class="lg-switch">New user? <button type="button" class="lg-link" (click)="go('signup')">Create account</button></p>
          </form>
        } @else {
          <form class="lg-card" (ngSubmit)="signup()">
            <img class="lg-logo" src="/jio-logo.png" alt="Jio" />
            <h2 class="lg-product">5G Site Planning and Engineering Product</h2>
            <h3 class="lg-title">Create account</h3>
            <p class="lg-sub">Fill in your details to get started.</p>

            <label for="sn">Full name</label>
            <input id="sn" class="field" name="sn" [(ngModel)]="sn" (ngModelChange)="err = ''" autocomplete="name" />

            <label for="su">Username</label>
            <input id="su" class="field" name="su" [(ngModel)]="su" (ngModelChange)="err = ''" autocomplete="username" />
            <p class="hint">Letters, numbers, dot, dash or underscore (min 3).</p>

            <label for="sp">Password</label>
            <div class="field pw">
              <input id="sp" name="sp" [type]="show ? 'text' : 'password'" [(ngModel)]="sp" (ngModelChange)="err = ''" autocomplete="new-password" />
              <button type="button" class="icon-btn plain" (click)="show = !show" aria-label="Show password"><app-icon [name]="show ? 'eyeoff' : 'eye'" /></button>
            </div>

            <label for="sc">Confirm password</label>
            <div class="field pw">
              <input id="sc" name="sc" [type]="show ? 'text' : 'password'" [(ngModel)]="sc" (ngModelChange)="err = ''" autocomplete="new-password" />
            </div>

            @if (err) { <div class="err">{{ err }}</div> }
            <button class="lg-btn" type="submit" [disabled]="busy" style="margin-top:22px">Create account</button>
            <p class="lg-switch">Already have an account? <button type="button" class="lg-link" (click)="go('login')">Login</button></p>
          </form>
        }
      </div>

      @if (reset) {
        <div class="overlay center" (click)="reset = false">
          <form class="modal small" (click)="$event.stopPropagation()" (ngSubmit)="doReset()">
            <div class="modal-head"><h4>Reset password</h4><button type="button" class="icon-btn plain" (click)="reset = false"><app-icon name="close" [size]="18" /></button></div>
            <label>Username</label><input class="field" name="ru" [(ngModel)]="ru" />
            <label>Current password</label><input class="field" type="password" name="rc" [(ngModel)]="rc" />
            <label>New password</label><input class="field" type="password" name="rn" [(ngModel)]="rn" />
            @if (msg) { <div [class]="ok ? 'ok' : 'err'">{{ msg }}</div> }
            <div class="modal-actions">
              <button type="button" class="btn ghost" (click)="reset = false">Cancel</button>
              <button class="btn primary" type="submit">Reset password</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
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