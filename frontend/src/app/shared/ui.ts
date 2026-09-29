import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const P: Record<string, string> = {
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  upload: '<path d="M7 18a4.5 4.5 0 01-.5-8.97A6 6 0 0118 10.5 3.75 3.75 0 0117.5 18"/><path d="M12 12v8M9 14.5l3-3 3 3"/>',
  download: '<path d="M7 18a4.5 4.5 0 01-.5-8.97A6 6 0 0118 10.5 3.75 3.75 0 0117.5 18"/><path d="M12 11v9M9 17.5l3 3 3-3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18M10.6 5.1A10 10 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4M6.5 6.6A16.5 16.5 0 002 12s3.6 7 10 7a9.7 9.7 0 004.2-.9"/><path d="M9.9 9.9a3 3 0 004.2 4.2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  users: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/><path d="M3 10.5l2 1M21 10.5l-2 1"/>',
  doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7M9 19h4"/>',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  template: '<span class="ic" [innerHTML]="html"></span>',
  styles: ['.ic{display:inline-flex;line-height:0}'],
})
export class IconComponent {
  private s = inject(DomSanitizer);
  html: SafeHtml = '';
  @Input() set name(n: string) { this._n = n; this.render(); }
  @Input() set size(v: number) { this._s = v; this.render(); }
  private _n = ''; private _s = 20;
  private render() {
    this.html = this.s.bypassSecurityTrustHtml(
      `<svg width="${this._s}" height="${this._s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${P[this._n] || ''}</svg>`,
    );
  }
}

@Component({
  selector: 'app-file-icon',
  standalone: true,
  template: `<svg [attr.width]="size" [attr.height]="size * 28 / 26" viewBox="0 0 26 28" [attr.aria-label]="kind">
    <path d="M4 2h11l6 6v6M15 2v6h6M4 2v20" fill="none" stroke="#1d3fd1" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
    <text x="12" y="25" font-size="8" font-weight="800" text-anchor="middle" fill="#1d3fd1" font-family="Inter, sans-serif">{{ kind }}</text>
  </svg>`,
  styles: ['svg{display:block}'],
})
export class FileIconComponent { @Input() kind = 'XLS'; @Input() size = 26; }

@Component({
  selector: 'app-jio-logo',
  standalone: true,
  template: '<img class="jio-img" [src]="variant === \'white\' ? \'/jio-logo-white.png\' : \'/jio-logo.png\'" [style.width.px]="size" [style.height.px]="size" alt="Jio" />',
  styles: ['.jio-img{display:block;flex:none;border-radius:50%}'],
})
export class JioLogoComponent { @Input() size = 44; @Input() variant: 'blue' | 'white' = 'blue'; }