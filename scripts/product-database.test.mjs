import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { products } from '../src/app/core/catalog.ts';
import { ProductDatabase } from '../src/app/core/product-database.ts';

test('creates a catalog from the initial products and supports reads by ID', async t => {
  const database = new ProductDatabase(products, new IDBFactory());
  t.after(() => database.close());
  assert.deepEqual((await database.list()).map(product => product.id).sort(), products.map(product => product.id).sort());
  assert.deepEqual(await database.get('runner'), products.find(product => product.id === 'runner'));
  assert.equal(await database.get('missing'), undefined);
});

test('persists additions and edits without replacing them with seed data after reopening', async t => {
  const factory = new IDBFactory();
  const database = new ProductDatabase(products, factory);
  const original = products.find(product => product.id === 'runner');
  await database.save({ ...original, price: 1234, name: 'Local product' });
  await database.save({ ...original, id: 'new-product', name: 'New product' });
  database.close();
  const reopened = new ProductDatabase(products.map(product => ({ ...product, price: 9999 })), factory);
  t.after(() => reopened.close());
  assert.equal((await reopened.get('runner')).price, 1234);
  assert.equal((await reopened.get('runner')).name, 'Local product');
  assert.equal((await reopened.list()).length, products.length + 1);
});

test('does not recreate deleted products or an intentionally empty catalog', async t => {
  const factory = new IDBFactory();
  const database = new ProductDatabase(products, factory);
  for (const product of products) await database.remove(product.id);
  database.close();
  const reopened = new ProductDatabase(products, factory);
  t.after(() => reopened.close());
  assert.deepEqual(await reopened.list(), []);
});

test('rejects invalid product records without changing existing data', async t => {
  const database = new ProductDatabase(products, new IDBFactory());
  t.after(() => database.close());
  const original = products[0];
  for (const change of [{ price: -1 }, { price: NaN }, { sizes: [] }, { name: '' }, { description: null }]) {
    await assert.rejects(database.save({ ...original, ...change }));
  }
  assert.deepEqual(await database.get(original.id), original);
});

test('initial seeding is atomic when seed records conflict', async t => {
  const factory = new IDBFactory();
  const invalid = new ProductDatabase([products[0], products[0]], factory);
  await assert.rejects(invalid.list());
  invalid.close();
  const valid = new ProductDatabase(products, factory);
  t.after(() => valid.close());
  assert.equal((await valid.list()).length, products.length);
});

test('recovers after database access is temporarily denied', async t => {
  const factory = new IDBFactory();
  let denied = true;
  const database = new ProductDatabase(products, {
    open(...args) { if (denied) throw new Error('Storage denied'); return factory.open(...args); }
  });
  t.after(() => database.close());
  await assert.rejects(database.list(), /Storage denied/);
  denied = false;
  assert.equal((await database.list()).length, products.length);
});
