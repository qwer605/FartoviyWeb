import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { Product, products as initialProducts } from './catalog';
import { I18n, readStorage, writeStorage } from './i18n';
import { ProductDatabase } from './product-database';

export interface CartItem { id: string; size: string; qty: number; }

@Injectable({ providedIn: 'root' })
export class Store implements OnDestroy {
  readonly i18n = inject(I18n);
  private readonly database = new ProductDatabase(initialProducts);
  private readonly productList = signal<Product[]>([]);
  readonly products = this.productList.asReadonly();
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly cart = signal<CartItem[]>([]);
  private loadInProgress = false;
  private hasLoadedProducts = false;
  readonly count = computed(() => this.cart().reduce((total, item) => total + item.qty, 0));
  readonly total = computed(() => this.cart().reduce((total, item) => total + (this.product(item.id)?.price ?? 0) * item.qty, 0));

  constructor() {
    effect(() => {
      if (!this.loading() && !this.loadError()) writeStorage('fartoviy-cart', this.cart());
    });
    void this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    if (this.loadInProgress) return;
    this.loadInProgress = true;
    this.loading.set(true);
    this.loadError.set(false);
    try {
      const products = await this.database.list();
      this.productList.set(products);
      this.cart.set(this.loadCart(this.hasLoadedProducts ? this.cart() : readStorage('fartoviy-cart')));
      this.hasLoadedProducts = true;
    } catch (error) {
      console.error('Cannot load local product catalog:', error);
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
      this.loadInProgress = false;
    }
  }

  product(id: string): Product | undefined {
    return this.products().find(product => product.id === id);
  }

  money(amount: number): string {
    const language = this.i18n.language();
    return new Intl.NumberFormat(language).format(amount) + ' ' + this.i18n.text('у.е.');
  }

  add(product: Product, size: string): boolean {
    if (this.loading() || this.loadError() || !this.product(product.id)?.sizes.includes(size)) return false;
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

  private loadCart(data: unknown): CartItem[] {
    if (!Array.isArray(data)) return [];
    return data.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false;
      const product = this.product(item.id);
      return !!product && product.sizes.includes(item.size)
        && Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99;
    });
  }

  ngOnDestroy(): void { this.database.close(); }
}
