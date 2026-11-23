import { Injectable, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { collectionProducts, legacyProductIds, products as initialProducts } from './catalog';
import type { Currency, Product } from './catalog';
import { I18n, readStorage, writeStorage } from './i18n';
import { ProductDatabase } from './product-database';
import { cartFingerprint, OrderError } from './order';
import type { Customer, Order } from './order';

export interface CartItem { id: string; size: string; qty: number; }

const collectionOrder = new Map(collectionProducts.map((product, position) => [product.id, position]));

@Injectable({ providedIn: 'root' })
export class Store implements OnDestroy {
  readonly i18n = inject(I18n);
  private readonly database = new ProductDatabase(initialProducts);
  private readonly productList = signal<Product[]>([]);
  readonly products = this.productList.asReadonly();
  readonly collection = computed(() => this.products()
    .filter(product => !legacyProductIds.has(product.id))
    .sort((a, b) => (collectionOrder.get(a.id) ?? collectionOrder.size) - (collectionOrder.get(b.id) ?? collectionOrder.size)));
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly cart = signal<CartItem[]>([]);
  readonly submittingOrder = signal(false);
  private loadInProgress = false;
  private hasLoadedProducts = false;
  readonly count = computed(() => this.cart().reduce((total, item) => total + item.qty, 0));
  readonly cartTotal = computed(() => this.formatTotals(this.cart().flatMap(item => {
    const product = this.product(item.id);
    return product ? [{ total: product.price * item.qty, currency: product.currency }] : [];
  })));

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

  money(amount: number, currency?: Currency): string {
    const language = this.i18n.language();
    if (currency) {
      return new Intl.NumberFormat(language, { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount);
    }
    return new Intl.NumberFormat(language).format(amount) + ' ' + this.i18n.text('у.е.');
  }

  formatTotals(items: readonly { total: number; currency?: Currency }[]): string {
    const totals = new Map<Currency | undefined, number>();
    for (const { total, currency } of items) {
      totals.set(currency, (totals.get(currency) ?? 0) + Math.round(total * 100));
    }
    return Array.from(totals, ([currency, cents]) => this.money(cents / 100, currency)).join(' + ');
  }

  add(product: Product, size: string): boolean {
    if (this.submittingOrder() || this.loading() || this.loadError() || !this.product(product.id)?.sizes.includes(size)) return false;
    const existing = this.cart().find(item => item.id === product.id && item.size === size);
    if (existing && existing.qty >= 99) return false;
    writeStorage('fartoviy-checkout-attempt', null);
    this.cart.update(items => existing
      ? items.map(item => item === existing ? { ...item, qty: item.qty + 1 } : item)
      : [...items, { id: product.id, size, qty: 1 }]);
    return true;
  }

  changeQuantity(item: CartItem, delta: number): void {
    if (this.submittingOrder()) return;
    writeStorage('fartoviy-checkout-attempt', null);
    this.cart.update(items => items.map(current => current.id === item.id && current.size === item.size
      ? { ...current, qty: Math.min(99, Math.max(0, current.qty + delta)) } : current)
      .filter(current => current.qty > 0));
  }

  remove(item: CartItem): void {
    if (this.submittingOrder()) return;
    writeStorage('fartoviy-checkout-attempt', null);
    this.cart.update(items => items.filter(current => current.id !== item.id || current.size !== item.size));
  }

  async placeOrder(customer: Customer): Promise<Order> {
    if (this.submittingOrder() || this.loading() || this.loadError() || !this.cart().length) throw new OrderError('INVALID_CART');
    this.submittingOrder.set(true);
    try {
      const items = this.cart().map(item => {
        const product = this.product(item.id);
        if (!product) throw new OrderError('CATALOG_CHANGED');
        return { ...item, expectedPrice: product.price, expectedCurrency: product.currency };
      });
      const fingerprint = cartFingerprint(items);
      const saved = readStorage('fartoviy-checkout-attempt') as { id?: unknown; fingerprint?: unknown } | null;
      const id = saved?.fingerprint === fingerprint && typeof saved.id === 'string'
        && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)
        ? saved.id : crypto.randomUUID();
      writeStorage('fartoviy-checkout-attempt', { id, fingerprint });
      const order = await this.database.createOrder({ id, customer, items });
      // Keep the attempt token until the next cart edit so a crash/retry cannot duplicate the order.
      this.cart.set([]);
      writeStorage('fartoviy-cart', []);
      return order;
    } finally { this.submittingOrder.set(false); }
  }

  listOrders(): Promise<Order[]> { return this.database.listOrders(); }
  getOrder(id: string): Promise<Order | undefined> { return this.database.getOrder(id); }

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
