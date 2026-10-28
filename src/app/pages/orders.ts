import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { I18n, Translate } from '../core/i18n';
import type { Order } from '../core/order';

@Component({ selector: 'shop-orders', standalone: true, imports: [RouterLink, Translate],
  templateUrl: './orders.html', styleUrl: './orders.css' })
export class OrdersPage {
  readonly store = inject(Store);
  readonly i18n = inject(I18n);
  readonly orders = signal<Order[]>([]);
  readonly loading = signal(true);
  readonly error = signal(false);
  constructor() { void this.load(); }
  async load(): Promise<void> {
    this.loading.set(true); this.error.set(false);
    try { this.orders.set(await this.store.listOrders()); } catch { this.error.set(true); }
    finally { this.loading.set(false); }
  }
  date(value: string): string { return new Intl.DateTimeFormat(this.i18n.language(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
}
