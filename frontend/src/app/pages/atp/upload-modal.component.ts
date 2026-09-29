import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { TasksService } from '../../core/tasks.service';
import { FileIconComponent } from '../../shared/file-icon/file-icon.component';
import { IconComponent } from '../../shared/icon/icon.component';

interface Item { id: number; file: File; progress: number; }
const OK = /\.(xlsx?|csv)$/i;
let seq = 0;

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [IconComponent, FileIconComponent],
  templateUrl: './upload-modal.component.html',
  styleUrl: './upload-modal.component.scss',
})
export class UploadModalComponent implements OnDestroy {
  private api = inject(TasksService);
  @Output() closed = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();
  items: Item[] = [];
  err = '';
  busy = false;
  
  private timer = setInterval(() => {
    this.items.forEach((i) => { if (i.progress < 100) i.progress = Math.min(100, i.progress + 10 + Math.random() * 15); });
  }, 250);

  get ready() { return this.items.length > 0 && this.items.every((i) => i.progress >= 100) && !this.busy; }
  ngOnDestroy() { clearInterval(this.timer); }

  onDrop(e: DragEvent) { e.preventDefault(); this.add(e.dataTransfer?.files ?? null); }
  add(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list);
    const bad = files.filter((f) => !OK.test(f.name));
    this.err = bad.length ? `Only Excel (.xls, .xlsx) and CSV files are allowed. Skipped: ${bad.map((b) => b.name).join(', ')}` : '';
    files.filter((f) => OK.test(f.name)).forEach((file) => this.items.push({ id: ++seq, file, progress: 0 }));
  }
  remove(i: Item) { this.items = this.items.filter((x) => x !== i); }
  kind(n: string) { return /\.csv$/i.test(n) ? 'CSV' : 'XLS'; }
  size(b: number) { return b >= 1048576 ? `${Math.round(b / 1048576)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`; }
  round(n: number) { return Math.round(n); }

  upload() {
    this.busy = true; this.err = '';
    this.api.upload(this.items.map((i) => i.file)).subscribe({
      next: () => this.done.emit(),
      error: (e) => { this.busy = false; this.err = e.error?.detail || 'Upload failed. Try again.'; },
    });
  }
}