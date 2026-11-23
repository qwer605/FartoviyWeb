import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { archiveProducts, products, checkerBag, CHECKER_BAG_ID } from '../src/app/core/catalog.ts';
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

async function createExistingDatabase(factory, version, records) {
  return new Promise((resolve, reject) => {
    const request = factory.open('fartoviy-products', version);
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('products', { keyPath: 'id' });
      store.createIndex('category', 'category');
      records.forEach(record => store.add(record));
      const orders = request.result.createObjectStore('orders', { keyPath: 'id' });
      orders.createIndex('createdAt', 'createdAt');
      orders.add({ id: 'saved-order', createdAt: '2026-11-01T10:00:00Z', total: 1234 });
    };
    request.onsuccess = () => { request.result.close(); resolve(); };
    request.onerror = () => reject(request.error);
  });
}

test('v3 adds the camera-search bag once while preserving edited products, deletions and orders', async t => {
  const factory = new IDBFactory();
  await createExistingDatabase(factory, 2, [{ ...products[0], price: 1234, name: 'Local product' }]);
  const database = new ProductDatabase(products, factory);
  assert.deepEqual(await database.get(CHECKER_BAG_ID), checkerBag);
  assert.equal((await database.get('runner')).price, 1234);
  assert.equal((await database.get('runner')).name, 'Local product');
  assert.equal(await database.get('mini'), undefined);
  assert.equal((await database.list()).length, archiveProducts.length + 2);
  assert.equal((await database.listOrders())[0].id, 'saved-order');
  await database.remove(CHECKER_BAG_ID);
  database.close();
  const reopened = new ProductDatabase(products, factory);
  t.after(() => reopened.close());
  assert.equal(await reopened.get(CHECKER_BAG_ID), undefined);
});

test('v3 preserves an existing camera-search product instead of overwriting local fields', async t => {
  const factory = new IDBFactory();
  await createExistingDatabase(factory, 2, [{ ...checkerBag, price: 999, name: 'My bag' }]);
  const database = new ProductDatabase(products, factory);
  t.after(() => database.close());
  assert.equal((await database.get(CHECKER_BAG_ID)).price, 999);
  assert.equal((await database.get(CHECKER_BAG_ID)).name, 'My bag');
  assert.equal((await database.list()).length, archiveProducts.length + 1);
});

test('v4 adds the archive to an existing catalog without replacing local records or orders', async t => {
  const factory = new IDBFactory();
  const [first, second] = archiveProducts;
  const local = { ...first, price: 1234 };
  await createExistingDatabase(factory, 3, [local]);
  const database = new ProductDatabase(products, factory);
  assert.equal((await database.list()).length, archiveProducts.length);
  assert.deepEqual(await database.get(first.id), local);
  assert.deepEqual(await database.get(second.id), second);
  assert.equal(await database.get(CHECKER_BAG_ID), undefined);
  assert.equal((await database.listOrders())[0].id, 'saved-order');
  await database.remove(second.id);
  database.close();
  const reopened = new ProductDatabase(products, factory);
  t.after(() => reopened.close());
  assert.equal(await reopened.get(second.id), undefined);
});

test('v5 labels the saved camera-search bag price in euros and preserves its amount and other fields', async t => {
  const factory = new IDBFactory();
  const local = { ...checkerBag, currency: undefined, price: 3500, name: 'Local bag' };
  await createExistingDatabase(factory, 4, [local, products[0]]);
  const database = new ProductDatabase(products, factory);
  t.after(() => database.close());
  assert.deepEqual(await database.get(CHECKER_BAG_ID), { ...local, currency: 'EUR' });
  assert.deepEqual(await database.get(products[0].id), products[0]);
  assert.equal((await database.getOrder('saved-order')).total, 1234);
});

test('v6 adds descriptions and the Galliera name to the existing catalog while preserving local text and prices', async t => {
  const factory = new IDBFactory();
  const [chloe, cartier, , , , boots] = archiveProducts;
  const savedCartier = { ...cartier, description: 'My description', price: 6000 };
  await createExistingDatabase(factory, 5, [
    {
      ...checkerBag, name: 'Сумка в шахматную клетку', price: 3500, inspiration: undefined,
      description: 'Светлая сумка с тёмным шахматным узором, регулируемым ремнём и бежевой отделкой.'
    },
    { ...chloe, description: '', source: 'From “Friends” 1998' },
    savedCartier,
    { ...boots, description: '', source: 'From “Cruella De Ville” 1996' }
  ]);
  const database = new ProductDatabase(products, factory);
  t.after(() => database.close());
  assert.deepEqual(await database.get(CHECKER_BAG_ID), { ...checkerBag, price: 3500 });
  assert.deepEqual(await database.get(chloe.id), chloe);
  assert.deepEqual(await database.get(cartier.id), savedCartier);
  assert.deepEqual(await database.get(boots.id), boots);
  assert.equal((await database.getOrder('saved-order')).total, 1234);
});

test('v8 updates the default Galliera inspiration and preserves a local edit', async t => {
  const cases = [
    { version: 6, previous: undefined, expected: checkerBag.inspiration },
    { version: 7, previous: '«Сплетница»', expected: checkerBag.inspiration },
    { version: 7, previous: 'My own reference', expected: 'My own reference' }
  ];
  for (const { version, previous, expected } of cases) {
    const factory = new IDBFactory();
    const savedBag = { ...checkerBag, inspiration: previous, price: 3500 };
    await createExistingDatabase(factory, version, [savedBag]);
    const database = new ProductDatabase(products, factory);
    t.after(() => database.close());
    assert.deepEqual(await database.get(CHECKER_BAG_ID), { ...savedBag, inspiration: expected });
  }
});
