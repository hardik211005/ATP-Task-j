export interface User { username: string; name: string; role: string; }
export interface TaskFile { id: number; name: string; type: 'xls' | 'csv'; size: number; }
export interface Task { id: string; sapId: string; bands: string; user: string; initiated: string; files: TaskFile[]; }
export interface TaskPage {
  items: Task[]; total: number; page: number; pages: number; size: number;
  counts: { active: number; history: number };
}
export type Tab = 'active' | 'history';
export interface Filter { sapId: string; band: string; date: string; }
