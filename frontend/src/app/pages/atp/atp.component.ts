import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Filter, Tab, Task, TaskPage } from '../../core/models';
import { TasksService } from '../../core/tasks.service';
import { FileIconComponent, IconComponent } from '../../shared/ui';
import { FilterDrawerComponent } from './filter-drawer.component';
import { UploadModalComponent } from './upload-modal.component';

const EMPTY: Filter = { sapId: '', band: '', date: '' };
interface TabState { q: string; searchOpen: boolean; filter: Filter; page: number; size: number; sel: Set<string>; }
const blank = (): TabState => ({ q: '', searchOpen: false, filter: { ...EMPTY }, page: 1, size: 12, sel: new Set() });
const pad = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'app-atp',
  standalone: true,
  imports: [FormsModule, IconComponent, FileIconComponent, FilterDrawerComponent, UploadModalComponent],
  template: `
    <div class="card">
      <div class="card-head">
        <div class="tabs" role="tablist">
          <button role="tab" class="tab" [class.active]="tab === 'active'" [attr.aria-selected]="tab === 'active'" (click)="switchTab('active')">Active Tasks <em>{{ counts.active }}</em></button>
          <button role="tab" class="tab" [class.active]="tab === 'history'" [attr.aria-selected]="tab === 'history'" (click)="switchTab('history')">History <em>{{ counts.history }}</em></button>
        </div>
        <div class="tools">
          @if (cur.searchOpen) {
            <div class="searchbox">
              <app-icon name="search" [size]="16" />
              <input autofocus [placeholder]="tab === 'active' ? 'Search active tasks' : 'Search history'" [ngModel]="cur.q" (ngModelChange)="onSearch($event)" />
              <button class="icon-btn plain" (click)="closeSearch()" aria-label="Close search"><app-icon name="close" [size]="14" /></button>
            </div>
          } @else {
            <button class="icon-btn plain" (click)="cur.searchOpen = true" aria-label="Search"><app-icon name="search" /></button>
          }
          <button class="icon-btn plain" (click)="openFilter()" aria-label="Filter"><app-icon name="filter" /></button>
          @if (cur.sel.size > 0) {
            <button class="btn primary" (click)="downloadSelected()" [disabled]="busy"><app-icon name="download" /> Download Selected files</button>
          } @else {
            <button class="btn primary" (click)="showUpload = true"><app-icon name="upload" /> Upload</button>
          }
        </div>
      </div>

      @if (chips.length) {
        <div class="chips">
          @for (c of chips; track c[0]) {
            <span class="chip">{{ c[1] }}<button (click)="removeChip(c[0])" [attr.aria-label]="'Remove ' + c[1]"><app-icon name="close" [size]="12" /></button></span>
          }
          <button class="chip-clear" (click)="clearFilters()" aria-label="Clear all filters"><app-icon name="close" [size]="14" /></button>
        </div>
      }

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="cbcell"><input type="checkbox" class="cb" [checked]="allOnPage" [indeterminate]="someOnPage && !allOnPage" (change)="toggleAll()" aria-label="Select all on page" /></th>
              <th>Sr. No.</th><th>Sap ID</th><th>Band</th><th>File Type</th><th>Initiated</th><th>User Name</th><th class="ac">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (t of data.items; track t.id; let i = $index) {
              <tr [class.selected]="cur.sel.has(t.id)">
                <td class="cbcell"><input type="checkbox" class="cb" [checked]="cur.sel.has(t.id)" (change)="toggle(t.id)" [attr.aria-label]="'Select row ' + (start + i + 1)" /></td>
                <td>{{ start + i + 1 }}</td>
                <td>{{ t.sapId }}</td>
                <td>{{ t.bands }}</td>
                <td><span class="ftypes">@for (f of t.files; track f.id) { <app-file-icon [kind]="f.type.toUpperCase()" /> }</span></td>
                <td>{{ t.initiated }}</td>
                <td>{{ t.user }}</td>
                <td class="ac"><button class="icon-btn plain" (click)="download(t)" aria-label="Download"><app-icon name="download" /></button></td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="empty">{{ emptyText }}</td></tr>
            }
          </tbody>
        </table>
      </div>

      <div class="pager">
        <button class="icon-btn plain" [disabled]="data.page <= 1" (click)="go(data.page - 1)" aria-label="Previous page"><app-icon name="left" [size]="16" /></button>
        <span class="cur">{{ p2(data.page) }}</span><span>of</span><span>{{ data.pages }}</span>
        <button class="icon-btn plain" [disabled]="data.page >= data.pages" (click)="go(data.page + 1)" aria-label="Next page"><app-icon name="right" [size]="16" /></button>
        <div class="select rows">
          <select [ngModel]="cur.size" (ngModelChange)="setSize($event)">
            @for (n of [5, 10, 12, 20, 50]; track n) { <option [ngValue]="n">{{ n }} Row</option> }
          </select><app-icon name="down" [size]="14" />
        </div>
      </div>

      @if (showUpload) { <app-upload-modal (closed)="showUpload = false" (done)="onUploaded()" /> }
      @if (showFilter) {
        <app-filter-drawer [sapOptions]="sapOptions" [bandOptions]="bandOptions" [value]="cur.filter" (closed)="showFilter = false" (apply)="applyFilter($event)" />
      }
    </div>
  `,
})
export class AtpComponent implements OnInit, OnDestroy {
  private api = inject(TasksService);
  tab: Tab = 'active';
  // search / filter / page / selection are kept per tab so they never leak into the other tab
  state: Record<Tab, TabState> = { active: blank(), history: blank() };
  data: TaskPage = { items: [], total: 0, page: 1, pages: 1, size: 12, counts: { active: 0, history: 0 } };
  counts = { active: 0, history: 0 };
  showUpload = false; showFilter = false; busy = false;
  sapOptions: string[] = []; bandOptions: string[] = [];
  private searchTimer: any; private poll: any; private req = 0;

  get cur() { return this.state[this.tab]; }
  get start() { return (this.data.page - 1) * this.data.size; }
  get allOnPage() { return this.data.items.length > 0 && this.data.items.every((t) => this.cur.sel.has(t.id)); }
  get someOnPage() { return this.data.items.some((t) => this.cur.sel.has(t.id)); }
  get chips(): [string, string][] {
    const f = this.cur.filter, out: [string, string][] = [];
    if (f.sapId) out.push(['sapId', f.sapId]);
    if (f.band) out.push(['band', f.band]);
    if (f.date) { const [y, m, d] = f.date.split('-'); out.push(['date', `${d}/${m}/${y}`]); }
    return out;
  }
  get emptyText() {
    const filtering = this.cur.q.trim() || this.chips.length;
    if (filtering) return 'No results match your search or filters.';
    return this.tab === 'active' ? 'No active tasks. Upload a file to start one. It moves to History after 24 hours.' : 'Nothing in History yet.';
  }
  p2(n: number) { return pad(n); }

  ngOnInit() {
    this.load();
    // tasks older than 24h move to History on the server; refresh so the tabs follow along
    this.poll = setInterval(() => this.load(), 30000);
  }
  ngOnDestroy() { clearInterval(this.poll); clearTimeout(this.searchTimer); }

  load() {
    const id = ++this.req;
    const s = this.cur;
    this.api.list(this.tab, s.q, s.filter, s.page, s.size).subscribe((r) => {
      if (id !== this.req) return; // a newer request superseded this one
      this.data = r; this.counts = r.counts; s.page = r.page;
    });
  }
  switchTab(t: Tab) { if (t === this.tab) return; this.tab = t; this.showFilter = false; this.load(); }

  onSearch(v: string) {
    this.cur.q = v; this.cur.page = 1;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
  }
  closeSearch() { this.cur.q = ''; this.cur.searchOpen = false; this.cur.page = 1; this.load(); }

  openFilter() {
    this.api.filters(this.tab).subscribe((o) => { this.sapOptions = o.sapIds; this.bandOptions = o.bands; this.showFilter = true; });
  }
  applyFilter(f: Filter) { this.cur.filter = { ...f }; this.cur.page = 1; this.showFilter = false; this.load(); }
  removeChip(k: string) { (this.cur.filter as any)[k] = ''; this.cur.page = 1; this.load(); }
  clearFilters() { this.cur.filter = { ...EMPTY }; this.cur.page = 1; this.load(); }

  go(p: number) { this.cur.page = p; this.load(); }
  setSize(n: number) { this.cur.size = n; this.cur.page = 1; this.load(); }

  toggle(id: string) { const s = this.cur.sel; s.has(id) ? s.delete(id) : s.add(id); }
  toggleAll() {
    const all = this.allOnPage;
    this.data.items.forEach((t) => (all ? this.cur.sel.delete(t.id) : this.cur.sel.add(t.id)));
  }

  download(t: Task) { this.api.download(t.id).subscribe((r) => this.api.save(r, `${t.sapId}.zip`)); }
  downloadSelected() {
    this.busy = true;
    this.api.downloadMany([...this.cur.sel]).subscribe({
      next: (r) => { this.api.save(r, 'ATP11B-selected-files.zip'); this.busy = false; },
      error: () => (this.busy = false),
    });
  }

  onUploaded() { this.showUpload = false; this.tab = 'active'; this.state.active.page = 1; this.load(); }
}
