import { Component, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '../core/store';
import { I18n, Translate } from '../core/i18n';
import type { Order } from '../core/order';

@Component({ selector: 'shop-order', standalone: true, imports: [RouterLink, Translate],
  templateUrl: './order.html', styleUrl: './order.css' })
export class OrderPage {
  readonly store = inject(Store);
  readonly i18n = inject(I18n);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly order = signal<Order | undefined>(undefined);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly copyStatus = signal('');
  private request = 0;
  constructor() { effect(() => { void this.load(this.params().get('id') ?? ''); }); }
  async load(id = this.params().get('id') ?? ''): Promise<void> {
    const request = ++this.request;
    this.loading.set(true); this.error.set(false); this.copyStatus.set('');
    try { const order = await this.store.getOrder(id); if (request === this.request) this.order.set(order); }
    catch { if (request === this.request) this.error.set(true); }
    finally { if (request === this.request) this.loading.set(false); }
  }
  date(value: string): string { return new Intl.DateTimeFormat(this.i18n.language(), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  async copy(): Promise<void> {
    const order = this.order();
    if (!order) return;
    const t = (value: string) => this.i18n.text(value);
    const text = ['FARTOVIY ' + order.number, this.date(order.createdAt),
      ...order.items.map(item => `${t(item.name)} · ${t(item.size)} · ${item.qty} × ${this.store.money(item.unitPrice)} = ${this.store.money(item.total)}`),
      `${t('Итого')}: ${this.store.money(order.total)}`, `${t('Имя')}: ${order.customer.name}`, `Email: ${order.customer.email}`,
      ...(order.customer.phone ? [`${t('Телефон')}: ${order.customer.phone}`] : []), ...(order.customer.note ? [`${t('Комментарий')}: ${order.customer.note}`] : [])].join('\n');
    try { await navigator.clipboard.writeText(text); this.copyStatus.set('Заказ скопирован. Теперь его можно отправить продавцу.'); }
    catch { this.copyStatus.set('Не удалось скопировать заказ. Вы можете скопировать данные со страницы вручную.'); }
  }
}
