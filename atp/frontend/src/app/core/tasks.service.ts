import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Filter, Tab, Task, TaskPage, User } from './models';

@Injectable({ providedIn: 'root' })
export class TasksService {
  private http = inject(HttpClient);

  list(tab: Tab, q: string, f: Filter, page: number, size: number) {
    let p = new HttpParams().set('tab', tab).set('page', page).set('size', size);
    if (q.trim()) p = p.set('q', q.trim());
    if (f.sapId) p = p.set('sap_id', f.sapId);
    if (f.band) p = p.set('band', f.band);
    if (f.date) p = p.set('date', f.date);
    return this.http.get<TaskPage>('/api/tasks', { params: p });
  }
  filters(tab: Tab) {
    return this.http.get<{ sapIds: string[]; bands: string[] }>('/api/tasks/filters', { params: { tab } });
  }
  upload(files: File[]) {
    const fd = new FormData();
    files.forEach((f) => fd.append('files', f, f.name));
    return this.http.post<Task>('/api/tasks/upload', fd);
  }
  download(id: string) {
    return this.http.get(`/api/tasks/${id}/download`, { responseType: 'blob', observe: 'response' });
  }
  downloadMany(ids: string[]) {
    return this.http.post('/api/tasks/download', { ids }, { responseType: 'blob', observe: 'response' });
  }

  users() { return this.http.get<User[]>('/api/users'); }
  addUser(u: { name: string; username: string; password: string; role: string }) { return this.http.post<User>('/api/users', u); }
  deleteUser(username: string) { return this.http.delete(`/api/users/${encodeURIComponent(username)}`); }

  /** Save a blob response to disk using the filename from Content-Disposition. */
  save(res: HttpResponse<Blob>, fallback: string) {
    const m = /filename="?([^";]+)"?/.exec(res.headers.get('content-disposition') || '');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(res.body!);
    a.download = m ? m[1] : fallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
}
