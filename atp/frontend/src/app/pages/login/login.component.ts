import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../core/auth.service';
import { IconComponent, JioLogoComponent } from '../../shared/ui';

function tower(): string {
  let s = '<g stroke="#dfe6ff" stroke-width="3" stroke-linecap="round" fill="none">';
  s += '<circle cx="150" cy="70" r="14" fill="#c9d3ff"/><path d="M150 84v40"/>';
  for (const r of [26, 42, 58]) {
    const o = (0.9 - r / 90).toFixed(2);
    s += `<path d="M${150 - r} ${70 - r * 0.6}a${r} ${r} 0 0 0 0 ${r * 1.2}" opacity="${o}"/>`;
    s += `<path d="M${150 + r} ${70 - r * 0.6}a${r} ${r} 0 0 1 0 ${r * 1.2}" opacity="${o}"/>`;
  }
  s += '<path d="M150 124L96 540M150 124L204 540M144 124L88 540M156 124L212 540"/>';
  for (let i = 0; i < 12; i++) {
    const y = 150 + i * 34, h = 8 + i * 4.2, n = y + 34, hn = 8 + (i + 1) * 4.2;
    s += `<path d="M${150 - h} ${y}H${150 + h}"/><path stroke-width="2" d="M${150 - h} ${y}L${150 + hn} ${n}M${150 + h} ${y}L${150 - hn} ${n}"/>`;
  }
  s += '<ellipse cx="60" cy="230" rx="24" ry="30" fill="#b9c6ff" opacity=".7"/><ellipse cx="238" cy="195" rx="34" ry="34" fill="#d6ddff" opacity=".8"/></g>';
  return `<svg class="tower" viewBox="0 0 300 560">${s}</svg>`;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, IconComponent, JioLogoComponent],
  template: `
    <div class="login">
      <div class="login-art">
        <div [innerHTML]="towerHtml"></div>
        <div class="glow g1"></div><div class="glow g2"></div>
      </div>
      <div class="login-panel">
        <form class="login-card" (ngSubmit)="submit()">
          <app-jio-logo [size]="70" />
          <h2 class="product">5G Site Planning and Engineering Product</h2>
          <h3>Welcome</h3>
          <p class="sub">Please log in to continue your journey!</p>
          <label for="u">Username</label>
          <input id="u" class="field" name="u" [(ngModel)]="u" (ngModelChange)="err = ''" autocomplete="username" />
          <label for="p">Password</label>
          <div class="field pw">
            <input id="p" name="p" [type]="show ? 'text' : 'password'" [(ngModel)]="p" (ngModelChange)="err = ''" autocomplete="current-password" />
            <button type="button" class="icon-btn plain" (click)="show = !show" aria-label="Show password"><app-icon [name]="show ? 'eyeoff' : 'eye'" /></button>
          </div>
          <button type="button" class="link right" (click)="reset = true">Reset Password</button>
          @if (err) { <div class="err">{{ err }}</div> }
          <button class="btn primary block" type="submit" [disabled]="busy">Login</button>
        </form>
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
  towerHtml = inject(DomSanitizer).bypassSecurityTrustHtml(tower());
  u = ''; p = ''; show = false; err = ''; busy = false;
  reset = false; ru = ''; rc = ''; rn = ''; msg = ''; ok = false;

  submit() {
    if (!this.u.trim() || !this.p) { this.err = 'Enter your username and password.'; return; }
    this.busy = true;
    this.auth.login(this.u.trim(), this.p).subscribe({
      next: () => this.router.navigateByUrl('/atp'),
      error: (e) => { this.busy = false; this.err = e.status === 401 ? 'Username or password is incorrect.' : 'Cannot reach the server. Is the backend running?'; },
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
