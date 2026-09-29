import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { IconComponent, JioLogoComponent } from '../shared/ui';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, JioLogoComponent],
  template: `
    <div class="shell" [class.collapsed]="collapsed">
      <aside class="sidebar">
        <div class="brand">
          <app-jio-logo [size]="42" />
          <span>5G Site Planning and Engineering Product</span>
        </div>
        <nav>
          <a class="nav-item" routerLink="/atp" routerLinkActive="active"><app-icon name="doc" [size]="22" /><span>ATP 11B</span></a>
          <a class="nav-item" routerLink="/users" routerLinkActive="active"><app-icon name="users" [size]="22" /><span>User Management</span></a>
        </nav>
      </aside>
      <div class="main">
        <header class="topbar">
          <button class="icon-btn plain" (click)="collapsed = !collapsed" aria-label="Toggle sidebar"><app-icon name="menu" [size]="22" /></button>
          <h1>{{ title }}</h1>
          <div class="profile" (click)="menu = !menu">
            <div class="who"><b>{{ auth.user()?.name }}</b><small>{{ auth.user()?.role }}</small></div>
            <div class="avatar">{{ initials }}</div>
            @if (menu) {
              <div class="pop" (click)="$event.stopPropagation()"><button (click)="auth.logout()">Log out</button></div>
            }
          </div>
        </header>
        <section class="content"><router-outlet /></section>
      </div>
    </div>
  `,
})
export class LayoutComponent {
  auth = inject(AuthService);
  router = inject(Router);
  collapsed = false;
  menu = false;
  get title() { return this.router.url.startsWith('/users') ? 'User Management' : 'ATP 11B'; }
  get initials() {
    return (this.auth.user()?.name || '').split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  }
}
