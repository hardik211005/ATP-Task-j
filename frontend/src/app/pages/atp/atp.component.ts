import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Filter, Tab, Task, TaskPage } from '../../core/models';
import { TasksService } from '../../core/tasks.service';
import { FileIconComponent } from '../../shared/file-icon/file-icon.component';
import { IconComponent } from '../../shared/icon/icon.component';
import { FilterDrawerComponent } from './filter-drawer.component';
import { UploadModalComponent } from './upload-modal.component';

const EMPTY: Filter = { sapId: '', band: '', date: '' };
interface TabState { sort: 'asc' | 'desc'; q: string; searchOpen: boolean; filter: Filter; page: number; size: number; sel: Set<string>; }
const blank = (): TabState => ({ sort: 'desc', q: '', searchOpen: false, filter: { ...EMPTY }, page: 1, size: 12, sel: new Set() });
const pad = (n: number) => String(n).padStart(2, '0');

@Component({
  selector: 'app-atp',
  standalone: true,
  imports: [FormsModule, IconComponent, FileIconComponent, FilterDrawerComponent, UploadModalComponent],
  templateUrl: './atp.component.html',
  styleUrl: './atp.component.scss',
})
export class AtpComponent implements OnInit, OnDestroy {
  private api = inject(TasksService);
  tab: Tab = 'active';

  state: Record<Tab, TabState> = { active: blank(), history: blank() };
  data: TaskPage = { items: [], total: 0, page: 1, pages: 1, size: 12, counts: { active: 0, history: 0 } };
  counts = { active: 0, history: 0 };
  showUpload = false; showFilter = false; busy = false;
  sapOptions: string[] = []; bandOptions: string[] = [];
  private searchTimer: any; private poll: any; private req = 0;
  private cache: Partial<Record<Tab, TaskPage>> = {};

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

    // refresh in the background, but not while the tab is hidden
    this.poll = setInterval(() => { if (!document.hidden) this.load(); }, 30000);
  }
  ngOnDestroy() { clearInterval(this.poll); clearTimeout(this.searchTimer); }

  load() {
    const id = ++this.req;
    const s = this.cur;
    const tab = this.tab;
    this.api.list(tab, s.q, s.filter, s.page, s.size, s.sort).subscribe((r) => {
      if (id !== this.req) return;
      this.data = r; this.counts = r.counts; s.page = r.page;
      this.cache[tab] = r;
    });
  }
  switchTab(t: Tab) {
    if (t === this.tab) return;
    this.tab = t; this.showFilter = false;
    // show what we already have for this tab straight away, then refresh behind it
    const c = this.cache[t]; if (c) this.data = c;
    this.load();
  }
  toggleSort() { this.cur.sort = this.cur.sort === 'desc' ? 'asc' : 'desc'; this.cur.page = 1; this.load(); }

  onSearch(v: string) {
    this.cur.q = v; this.cur.page = 1;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 200);
  }
  closeSearch() { this.cur.q = ''; this.cur.searchOpen = false; this.cur.page = 1; this.load(); }

  openFilter() {
    this.showFilter = true; // open instantly; options fill in when they arrive
    this.api.filters(this.tab).subscribe((o) => { this.sapOptions = o.sapIds; this.bandOptions = o.bands; });
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

  onUploaded() { this.showUpload = false; this.tab = 'active'; this.state.active.page = 1; this.state.active.sort = 'desc'; this.load(); }
}