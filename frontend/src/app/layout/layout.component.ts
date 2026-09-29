import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { IconComponent } from '../shared/icon/icon.component';
import { JioLogoComponent } from '../shared/jio-logo/jio-logo.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, JioLogoComponent],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss',
})
export class LayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  router = inject(Router);
  collapsed = false;
  menu = false;
  get title() { return this.router.url.startsWith('/users') ? 'User Management' : 'ATP 11B'; }
  get initials() {
    return (this.auth.user()?.name || '').split(/\s+/).map((s) => s[0]).join('').slice(0, 2).toUpperCase();
  }
}