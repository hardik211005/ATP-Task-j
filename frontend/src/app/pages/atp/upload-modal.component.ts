import { Component, EventEmitter, OnDestroy, Output, inject } from '@angular/core';
import { TasksService } from '../../core/tasks.service';
import { FileIconComponent, IconComponent } from '../../shared/ui';

interface Item { id: number; file: File; progress: number; }
const OK = /\.(xlsx?|csv)$/i;
let seq = 0;

@Component({
  selector: 'app-upload-modal',
  standalone: true,
  imports: [IconComponent, FileIconComponent],
  template: `
    <div class="overlay right" (click)="closed.emit()">
      <div class="drawer" (click)="$event.stopPropagation()">
        <div class="drawer-head"><h4>Upload file</h4><button class="icon-btn plain" (click)="closed.emit()" aria-label="Close"><app-icon name="close" [size]="18" /></button></div>
        <p class="muted">Upload and attach files to continue</p>
        <div class="drop" (click)="input.click()" (dragover)="$event.preventDefault()" (drop)="onDrop($event)">
          <div class="drop-ic"><app-icon name="upload" [size]="20" /></div>
          <div><span class="link">Click to upload</span> or drag and drop</div>
          <small>Excel, CSV (SAP ID &amp; Band (Mhz))</small>
          <input #input type="file" hidden multiple accept=".xls,.xlsx,.csv" (change)="add(input.files); input.value = ''" />
        </div>
        @if (err) { <div class="err">{{ err }}</div> }
        <div class="file-list">
          @for (i of items; track i.id) {
            <div class="file-row" [class.done]="i.progress >= 100">
              <span class="file-ic"><app-file-icon [kind]="kind(i.file.name)" [size]="20" /></span>
              <div class="file-mid">
                <b>{{ i.file.name }}</b>
                <small>{{ size(i.file.size) }}</small>
                <div class="bar"><i [style.width.%]="i.progress"></i></div>
              </div>
              <div class="file-side">
                @if (i.progress >= 100) { <span class="tick"><app-icon name="check" [size]="12" /></span> }
                @else { <button class="icon-btn plain" (click)="remove(i)" aria-label="Remove file"><app-icon name="trash" [size]="18" /></button> }
                <small>{{ round(i.progress) }}%</small>
              </div>
            </div>
          }
        </div>
        <div class="drawer-actions">
          <button class="btn ghost" (click)="closed.emit()">Cancel</button>
          <button class="btn primary" [disabled]="!ready" (click)="upload()">{{ busy ? 'Uploading…' : 'Upload' }}</button>
        </div>
      </div>
    </div>
  `,
})
export class UploadModalComponent implements OnDestroy {
  private api = inject(TasksService);
  @Output() closed = new EventEmitter<void>();
  @Output() done = new EventEmitter<void>();
  items: Item[] = [];
  err = '';
  busy = false;
  // The attach bar is local feedback only; the real upload happens on the Upload button.
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