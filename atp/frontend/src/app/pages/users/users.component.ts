import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { User } from '../../core/models';
import { TasksService } from '../../core/tasks.service';
import { IconComponent } from '../../shared/ui';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="card">
      <div class="card-head"><div class="tabs"><span class="tab active">Users</span></div></div>
      @if (isAdmin) {
        <form class="user-form" (ngSubmit)="add()">
          <input class="field" name="n" placeholder="Full name" [(ngModel)]="f.name" />
          <input class="field" name="u" placeholder="Username" [(ngModel)]="f.username" />
          <input class="field" name="p" type="password" placeholder="Password" [(ngModel)]="f.password" />
          <select class="field" name="r" [(ngModel)]="f.role"><option>User</option><option>Admin</option></select>
          <button class="btn primary" type="submit">Add user</button>
        </form>
      }
      @if (err) { <div class="err pad">{{ err }}</div> }
      <div class="table-wrap">
        <table>
          <thead><tr><th>Sr. No.</th><th>Name</th><th>Username</th><th>Role</th><th class="ac">Actions</th></tr></thead>
          <tbody>
            @for (x of list; track x.username; let i = $index) {
              <tr>
                <td>{{ i + 1 }}</td><td>{{ x.name }}</td><td>{{ x.username }}</td><td>{{ x.role }}</td>
                <td class="ac">
                  @if (isAdmin && x.username !== auth.user()?.username) {
                    <button class="icon-btn plain" (click)="del(x)" aria-label="Delete user"><app-icon name="trash" [size]="18" /></button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TasksService);
  list: User[] = [];
  f = { name: '', username: '', password: '', role: 'User' };
  err = '';
  get isAdmin() { return this.auth.user()?.role === 'Admin'; }

  ngOnInit() { this.load(); }
  load() { this.api.users().subscribe((u) => (this.list = u)); }
  add() {
    if (!this.f.name.trim() || !this.f.username.trim() || this.f.password.length < 6) {
      this.err = 'Fill all fields. Password needs 6+ characters.'; return;
    }
    this.api.addUser(this.f).subscribe({
      next: () => { this.err = ''; this.f = { name: '', username: '', password: '', role: 'User' }; this.load(); },
      error: (e) => (this.err = e.error?.detail || 'Could not add the user.'),
    });
  }
  del(u: User) { this.api.deleteUser(u.username).subscribe(() => this.load()); }
}
