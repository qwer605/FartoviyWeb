import type { Product } from './catalog';
import { buildOrder, validateOrderDraft } from './order';
import type { Order, OrderDraft } from './order';

export const PRODUCT_DATABASE_NAME = 'fartoviy-products';
const VERSION = 2;
const STORE = 'products';

export function validateProduct(value: unknown): asserts value is Product {
  if (!value || typeof value !== 'object') throw new Error('Invalid product');
  const product = value as Record<string, unknown>;
  for (const field of ['id', 'name', 'category', 'label', 'image']) {
    if (typeof product[field] !== 'string' || !product[field].trim()) throw new Error('Invalid product ' + field);
  }
  if (typeof product['description'] !== 'string' || typeof product['price'] !== 'number'
    || !Number.isFinite(product['price']) || product['price'] < 0
    || !Array.isArray(product['sizes']) || !product['sizes'].length
    || !product['sizes'].every(size => typeof size === 'string' && size.trim())) {
    throw new Error('Invalid product details');
  }
}

/** Durable browser-local catalog. Seed data is inserted only when the DB is created. */
export class ProductDatabase {
  private connection?: Promise<IDBDatabase>;
  private readonly seed: readonly Product[];
  private readonly factory: IDBFactory | undefined;
  private readonly name: string;

  constructor(seed: readonly Product[] = [], factory: IDBFactory | undefined = globalThis.indexedDB, name = PRODUCT_DATABASE_NAME) {
    this.seed = seed;
    this.factory = factory;
    this.name = name;
  }

  async list(): Promise<Product[]> {
    const products = await this.request<Product[]>('readonly', store => store.getAll());
    products.forEach(validateProduct);
    return products;
  }

  async get(id: string): Promise<Product | undefined> {
    const product = await this.request<Product | undefined>('readonly', store => store.get(id));
    if (product !== undefined) validateProduct(product);
    return product;
  }

  async save(product: Product): Promise<void> {
    validateProduct(product);
    await this.request('readwrite', store => store.put(product));
  }

  async create(product: Product): Promise<void> {
    validateProduct(product);
    await this.request('readwrite', store => store.add(product));
  }

  async update(product: Product): Promise<void> {
    validateProduct(product);
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      let missing = false;
      let failure: unknown;
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(missing
        ? new DOMException('Product no longer exists', 'NotFoundError')
        : failure ?? transaction.error ?? new Error('Cannot update product'));
      const request = store.get(product.id);
      request.onsuccess = () => {
        if (!request.result) { missing = true; transaction.abort(); }
        else {
          try { store.put(product); }
          catch (error) { failure = error; transaction.abort(); }
        }
      };
    });
  }

  async remove(id: string): Promise<void> {
    await this.request('readwrite', store => store.delete(id));
  }

  async listOrders(): Promise<Order[]> {
    const orders = await this.request<Order[]>('readonly', store => store.getAll(), 'orders');
    return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getOrder(id: string): Promise<Order | undefined> {
    return this.request('readonly', store => store.get(id), 'orders');
  }

  async createOrder(draft: OrderDraft): Promise<Order> {
    const checked = validateOrderDraft(draft);
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE, 'orders'], 'readwrite');
      const orders = transaction.objectStore('orders');
      let result: Order;
      let failure: unknown;
      const abort = (error: unknown) => { failure = error; transaction.abort(); };
      transaction.onabort = transaction.onerror = () => reject(failure ?? transaction.error ?? new Error('Cannot save order'));
      transaction.oncomplete = () => resolve(result);
      const existing = orders.get(checked.id);
      existing.onsuccess = () => {
        // The same checkout token can only create one order, even across tabs/retries.
        if (existing.result) { result = existing.result; return; }
        const products: Product[] = [];
        let remaining = checked.items.length;
        for (const item of checked.items) {
          const request = transaction.objectStore(STORE).get(item.id);
          request.onsuccess = () => {
            try {
              if (request.result !== undefined) { validateProduct(request.result); products.push(request.result); }
              if (--remaining === 0) { result = buildOrder(checked, products); orders.add(result); }
            } catch (error) { abort(error); }
          };
        }
      };
    });
  }

  close(): void {
    const connection = this.connection;
    this.connection = undefined;
    void connection?.then(database => database.close(), () => {});
  }

  private open(): Promise<IDBDatabase> {
    if (this.connection) return this.connection;
    this.connection = new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.factory) { reject(new Error('IndexedDB is unavailable')); return; }
      let settled = false;
      const fail = (error: unknown) => { if (!settled) { settled = true; reject(error); } };
      const request = this.factory.open(this.name, VERSION);
      request.onupgradeneeded = event => {
        try {
          if (event.oldVersion < 1) {
            const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
            store.createIndex('category', 'category', { unique: false });
            for (const product of this.seed) { validateProduct(product); store.add(product); }
          }
          if (event.oldVersion < 2) {
            const orders = request.result.createObjectStore('orders', { keyPath: 'id' });
            orders.createIndex('createdAt', 'createdAt', { unique: false });
          }
        } catch (error) { request.transaction?.abort(); fail(error); }
      };
      request.onerror = () => fail(request.error ?? new Error('Cannot open product database'));
      request.onblocked = () => fail(new Error('Database upgrade blocked by another tab'));
      request.onsuccess = () => {
        const database = request.result;
        if (settled) { database.close(); return; }
        database.onversionchange = () => { database.close(); this.connection = undefined; };
        database.onclose = () => { this.connection = undefined; };
        settled = true;
        resolve(database);
      };
    }).catch(error => { this.connection = undefined; throw error; });
    return this.connection;
  }

  private async request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>, storeName = STORE): Promise<T> {
    const database = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      const request = operation(transaction.objectStore(storeName));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      // A request succeeding does not guarantee that its transaction was committed.
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error ?? new Error('Product transaction failed'));
    });
  }
}
