import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-file-icon',
  standalone: true,
  templateUrl: './file-icon.component.html',
  styleUrl: './file-icon.component.scss',
})
export class FileIconComponent {
  @Input() kind = 'XLS';
  @Input() size = 26;
}
