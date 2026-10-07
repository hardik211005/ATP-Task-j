import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { User } from '../../core/models';
import { TasksService } from '../../core/tasks.service';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
})
export class UsersComponent implements OnInit {
  auth = inject(AuthService);
  private api = inject(TasksService);
  list: User[] = [];
  f = { name: '', username: '', password: '', role: 'User' };
  err = '';
  get isAdmin() { return this.auth.user()?.role === 'Admin'; }
  canDelete(u: User) { return this.isAdmin && u.username !== this.auth.user()?.username; }

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
