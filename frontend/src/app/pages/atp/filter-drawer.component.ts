import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Filter } from '../../core/models';
import { IconComponent } from '../../shared/ui';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="overlay right" (click)="closed.emit()">
      <div class="drawer narrow" (click)="$event.stopPropagation()">
        <div class="drawer-head"><h4>Filter by</h4><button class="icon-btn plain" (click)="closed.emit()" aria-label="Close"><app-icon name="close" [size]="18" /></button></div>
        <label>SAP ID</label>
        <div class="select">
          <select [(ngModel)]="v.sapId">
            <option value="">Select SAP ID</option>
            @for (s of sapOptions; track s) { <option [value]="s">{{ s }}</option> }
          </select><app-icon name="down" [size]="18" />
        </div>
        <label>Band</label>
        <div class="select">
          <select [(ngModel)]="v.band">
            <option value="">Select band</option>
            @for (b of bandOptions; track b) { <option [value]="b">{{ b }}</option> }
          </select><app-icon name="down" [size]="18" />
        </div>
        <label>Timestamp</label>
        <div class="select date" [class.empty]="!v.date">
          <input type="date" [(ngModel)]="v.date" aria-label="Timestamp" /><span class="ph">Select Timestamp</span><app-icon name="calendar" />
        </div>
        <div class="drawer-actions">
          <button class="btn ghost" (click)="closed.emit()">Cancel</button>
          <button class="btn primary" (click)="apply.emit(v)">Apply</button>
        </div>
      </div>
    </div>
  `,
})
export class FilterDrawerComponent implements OnInit {
  @Input() sapOptions: string[] = [];
  @Input() bandOptions: string[] = [];
  @Input() value!: Filter;
  @Output() apply = new EventEmitter<Filter>();
  @Output() closed = new EventEmitter<void>();
  v: Filter = { sapId: '', band: '', date: '' };
  ngOnInit() { this.v = { ...this.value }; }
}