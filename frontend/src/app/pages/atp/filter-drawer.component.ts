import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Filter } from '../../core/models';
import { IconComponent } from '../../shared/icon/icon.component';

@Component({
  selector: 'app-filter-drawer',
  standalone: true,
  imports: [FormsModule, IconComponent],
  templateUrl: './filter-drawer.component.html',
  styleUrl: './filter-drawer.component.scss',
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