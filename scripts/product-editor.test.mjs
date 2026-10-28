import assert from 'node:assert/strict';
import test from 'node:test';
import { IDBFactory } from 'fake-indexeddb';
import { products } from '../src/app/core/catalog.ts';
import { ProductDatabase } from '../src/app/core/product-database.ts';
import { editedProduct, productFields, isProductImage } from '../src/app/core/product-editor.ts';

test('normalizes editor fields and removes duplicate sizes while preserving product data', () => {
  assert.deepEqual(editedProduct(productFields(products[0])), products[0]);
  const product = editedProduct({ ...productFields(products[0]), name: ' Test ', price: '12.34', sizes: 'S, M; S\nL' });
  assert.equal(product.name, 'Test');
  assert.equal(product.price, 12.34);
  assert.deepEqual(product.sizes, ['S', 'M', 'L']);
});

test('rejects invalid editor fields and unsafe image sources', () => {
  const fields = productFields(products[0]);
  for (const change of [{ id: '../bad' }, { name: ' ' }, { label: '' }, { category: 'unknown' },
    { price: '' }, { price: '-1' }, { price: 'Infinity' }, { price: '1.234' }, { price: '9999999999999999' },
    { sizes: ' , ' }, { sizes: 'a'.repeat(41) }, { description: 'a'.repeat(4001) }, { image: 'javascript:alert(1)' }]) {
    assert.throws(() => editedProduct({ ...fields, ...change }), undefined, JSON.stringify(change));
  }
  for (const source of ['http://example.com/a.jpg', '//example.com/a.jpg', 'data:image/svg+xml;base64,PHN2Zz4=', 'assets/../secret.png']) {
    assert.equal(isProductImage(source), false);
  }
  assert.equal(isProductImage('https://example.com/a.jpg'), true);
  assert.equal(isProductImage('data:image/png;base64,YQ=='), true);
});

test('creation cannot overwrite a duplicate ID and editing cannot resurrect a deleted product', async t => {
  const database = new ProductDatabase(products, new IDBFactory());
  t.after(() => database.close());
  const original = products[0];
  await assert.rejects(database.create({ ...original, name: 'Overwrite' }), { name: 'ConstraintError' });
  assert.deepEqual(await database.get(original.id), original);
  const added = { ...original, id: 'local-product', name: 'Created' };
  await database.create(added);
  await database.update({ ...added, name: 'Edited', price: 12.34 });
  assert.equal((await database.get(added.id)).name, 'Edited');
  await database.remove(added.id);
  await assert.rejects(database.update(added), { name: 'NotFoundError' });
  assert.equal(await database.get(added.id), undefined);
});
