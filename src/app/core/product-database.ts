import type { Product } from './catalog';

export const PRODUCT_DATABASE_NAME = 'fartoviy-products';
const VERSION = 1;
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

  async remove(id: string): Promise<void> {
    await this.request('readwrite', store => store.delete(id));
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
      request.onupgradeneeded = () => {
        try {
          const store = request.result.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          for (const product of this.seed) { validateProduct(product); store.add(product); }
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

  private async request<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.open();
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction(STORE, mode);
      const request = operation(transaction.objectStore(STORE));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      // A request succeeding does not guarantee that its transaction was committed.
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(transaction.error ?? new Error('Product transaction failed'));
    });
  }
}
