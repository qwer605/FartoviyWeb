import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { products } from '../src/app/core/catalog.ts';
import { buildOrder, cartFingerprint, OrderError } from '../src/app/core/order.ts';
import { ProductDatabase } from '../src/app/core/product-database.ts';

const customer = { name: ' Alex Test ', email: ' alex@example.com ', phone: '', note: ' Call first ' };
const draft = (id = 'order-one') => ({ id, customer: { ...customer }, items: [{ id: 'runner', size: '37', qty: 2, expectedPrice: 6490 }] });

test('creates a normalized order with exact decimal line totals', () => {
  const product = { ...products[0], price: 0.1 };
  const request = draft(); request.items[0].expectedPrice = 0.1; request.items[0].qty = 3;
  const order = buildOrder(request, [product], '2026-10-28T12:00:00.000Z');
  assert.equal(order.total, 0.3);
  assert.equal(order.items[0].total, 0.3);
  assert.equal(order.customer.name, 'Alex Test');
  assert.equal(order.customer.email, 'alex@example.com');
  assert.equal(order.customer.note, 'Call first');
  assert.equal(order.status, 'saved');
});

test('rejects invalid contacts, empty or duplicated cart lines and invalid quantities', () => {
  for (const patch of [{ name: '   ' }, { email: 'not-email' }, { note: 'x'.repeat(1001) }]) {
    const request = draft(); Object.assign(request.customer, patch);
    assert.throws(() => buildOrder(request, products), error => error instanceof OrderError && error.code === 'INVALID_CUSTOMER');
  }
  const empty = draft(); empty.items = [];
  assert.throws(() => buildOrder(empty, products), /INVALID_CART/);
  const duplicate = draft(); duplicate.items.push({ ...duplicate.items[0] });
  assert.throws(() => buildOrder(duplicate, products), /INVALID_CART/);
  for (const qty of [0, -1, 1.5, 100, NaN]) {
    const request = draft(); request.items[0].qty = qty;
    assert.throws(() => buildOrder(request, products), /INVALID_CART/);
  }
});

test('requires explicit reconfirmation when a price, product or size changes', () => {
  assert.throws(() => buildOrder(draft(), []), /CATALOG_CHANGED/);
  assert.throws(() => buildOrder(draft(), [{ ...products[0], price: 7000 }]), /CATALOG_CHANGED/);
  assert.throws(() => buildOrder(draft(), [{ ...products[0], sizes: ['40'] }]), /CATALOG_CHANGED/);
});

test('persists an immutable order snapshot after products are edited or removed', async t => {
  const factory = new IDBFactory();
  const database = new ProductDatabase(products, factory);
  const order = await database.createOrder(draft());
  await database.save({ ...products[0], price: 9000, name: 'Changed product' });
  await database.remove('runner');
  database.close();
  const reopened = new ProductDatabase(products, factory);
  t.after(() => reopened.close());
  const saved = await reopened.getOrder(order.id);
  assert.deepEqual(saved, order);
  assert.equal(saved.items[0].name, 'Кроссовки Red Runner');
  assert.equal(saved.total, 12980);
});

test('the same checkout token cannot create duplicate orders, including concurrent calls', async t => {
  const factory = new IDBFactory();
  const first = new ProductDatabase(products, factory);
  const second = new ProductDatabase(products, factory);
  t.after(() => { first.close(); second.close(); });
  const [one, two] = await Promise.all([first.createOrder(draft()), second.createOrder(draft())]);
  assert.deepEqual(one, two);
  assert.equal((await first.listOrders()).length, 1);
  await first.remove('runner');
  assert.deepEqual(await first.createOrder(draft()), one);
});

test('a failed order does not leave a partial record and can be retried', async t => {
  const database = new ProductDatabase(products, new IDBFactory());
  t.after(() => database.close());
  await database.save({ ...products[0], price: 7000 });
  await assert.rejects(database.createOrder(draft()), /CATALOG_CHANGED/);
  assert.deepEqual(await database.listOrders(), []);
  const request = draft(); request.items[0].expectedPrice = 7000;
  assert.equal((await database.createOrder(request)).total, 14000);
  assert.equal((await database.listOrders()).length, 1);
});

test('upgrades the existing v1 catalog without replacing user changes', async t => {
  const factory = new IDBFactory();
  await new Promise((resolve, reject) => {
    const request = factory.open('fartoviy-products', 1);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('products', { keyPath: 'id' });
      store.createIndex('category', 'category');
      store.add({ ...products[0], price: 1234 });
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  });
  const database = new ProductDatabase(products, factory);
  t.after(() => database.close());
  assert.equal((await database.list()).length, 1);
  assert.equal((await database.get('runner')).price, 1234);
  assert.deepEqual(await database.listOrders(), []);
  const request = draft(); request.items[0].expectedPrice = 1234;
  assert.equal((await database.createOrder(request)).total, 2468);
});

test('checkout fingerprints preserve cart identity across item ordering', () => {
  const items = [{ id: 'a', size: 'M', qty: 1 }, { id: 'b', size: 'L', qty: 2 }];
  assert.equal(cartFingerprint(items), cartFingerprint([...items].reverse()));
  assert.notEqual(cartFingerprint(items), cartFingerprint([{ ...items[0], qty: 2 }, items[1]]));
});
