import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-jio-logo',
  standalone: true,
  templateUrl: './jio-logo.component.html',
  styleUrl: './jio-logo.component.scss',
})
export class JioLogoComponent {
  @Input() size = 44;
  @Input() variant: 'blue' | 'white' = 'blue';
}
