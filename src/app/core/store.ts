import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Product, products } from './catalog';
import { I18n, readStorage, writeStorage } from './i18n';

export interface CartItem { id: string; size: string; qty: number; }

@Injectable({ providedIn: 'root' })
export class Store {
  readonly i18n = inject(I18n);
  readonly products = products;
  readonly cart = signal<CartItem[]>(this.loadCart());
  readonly count = computed(() => this.cart().reduce((total, item) => total + item.qty, 0));
  readonly total = computed(() => this.cart().reduce((total, item) => total + this.product(item.id)!.price * item.qty, 0));

  constructor() {
    effect(() => { writeStorage('fartoviy-cart', this.cart()); });
  }

  product(id: string): Product | undefined {
    return products.find(product => product.id === id);
  }

  money(amount: number): string {
    const language = this.i18n.language();
    return new Intl.NumberFormat(language).format(amount) + ' ' + this.i18n.text('у.е.');
  }

  add(product: Product, size: string): boolean {
    if (!product.sizes.includes(size)) return false;
    const existing = this.cart().find(item => item.id === product.id && item.size === size);
    if (existing && existing.qty >= 99) return false;
    this.cart.update(items => existing
      ? items.map(item => item === existing ? { ...item, qty: item.qty + 1 } : item)
      : [...items, { id: product.id, size, qty: 1 }]);
    return true;
  }

  changeQuantity(item: CartItem, delta: number): void {
    this.cart.update(items => items.map(current => current.id === item.id && current.size === item.size
      ? { ...current, qty: Math.min(99, Math.max(0, current.qty + delta)) } : current)
      .filter(current => current.qty > 0));
  }

  remove(item: CartItem): void {
    this.cart.update(items => items.filter(current => current.id !== item.id || current.size !== item.size));
  }

  private loadCart(): CartItem[] {
    const data = readStorage('fartoviy-cart');
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false;
      const product = products.find(product => product.id === item.id);
      return !!product && product.sizes.includes(item.size)
        && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99;
    });
  }
}
