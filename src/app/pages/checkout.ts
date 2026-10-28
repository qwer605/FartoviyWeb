import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { Translate } from '../core/i18n';
import { OrderError } from '../core/order';
import type { Customer } from '../core/order';

@Component({
  selector: 'shop-checkout', standalone: true, imports: [RouterLink, Translate],
  templateUrl: './checkout.html', styleUrl: './checkout.css'
})
export class CheckoutPage {
  readonly store = inject(Store);
  private readonly router = inject(Router);
  readonly error = signal('');
  readonly customer = signal<Customer>({ name: '', email: '', phone: '', note: '' });

  async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.store.submittingOrder()) return;
    const data = new FormData(event.target as HTMLFormElement);
    const customer = { name: String(data.get('name') ?? ''), email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? ''), note: String(data.get('note') ?? '') };
    this.customer.set(customer);
    this.error.set('');
    let saved = false;
    try {
      const order = await this.store.placeOrder(customer);
      saved = true;
      if (!await this.router.navigate(['/orders', order.id])) this.error.set('Заказ сохранён. Откройте его в разделе «Мои заказы».');
    } catch (error) {
      if (saved) {
        this.error.set('Заказ сохранён. Откройте его в разделе «Мои заказы».');
      } else if (error instanceof OrderError && error.code === 'CATALOG_CHANGED') {
        await this.store.loadProducts();
        this.error.set('Каталог изменился. Проверьте состав и сумму заказа и подтвердите ещё раз.');
      } else if (error instanceof OrderError && error.code === 'INVALID_CUSTOMER') {
        this.error.set('Укажите имя и корректный email. Проверьте длину заполненных полей.');
      } else {
        this.error.set('Не удалось сохранить заказ. Корзина сохранена. Повторите попытку.');
      }
    }
  }
}
