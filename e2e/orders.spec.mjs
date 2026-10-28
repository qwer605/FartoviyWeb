import { test, expect } from '@playwright/test';

async function prepareCheckout(page) {
  await page.goto('#/product/runner');
  await expect(page.getByRole('heading', { name: 'Sneakers Red Runner', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'Go to cart', exact: true }).click();
  await page.getByRole('link', { name: 'Checkout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Checkout', exact: true })).toBeVisible();
}

async function contacts(page) {
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Alex Test');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('alex@example.com');
}

async function database(page, action) {
  return page.evaluate(action => new Promise((resolve, reject) => {
    const request = indexedDB.open('fartoviy-products');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['products', 'orders'], 'readwrite');
      const store = transaction.objectStore('products');
      let result;
      if (action === 'price') {
        const get = store.get('runner');
        get.onsuccess = () => store.put({ ...get.result, price: 7000 });
      } else if (action === 'delete') store.delete('runner');
      const orders = transaction.objectStore('orders').getAll();
      orders.onsuccess = () => { result = orders.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = transaction.onerror = () => { db.close(); reject(transaction.error); };
    };
  }), action);
}

test('saves an order, clears the cart, copies details and retains history snapshots', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await context.grantPermissions(['camera', 'clipboard-read', 'clipboard-write']);
  await prepareCheckout(page);
  await contacts(page);
  await page.getByRole('textbox', { name: 'Note (optional)', exact: true }).fill('Please contact me');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  await expect(page.getByText('This order is saved on this device. It has not been sent to the seller yet.', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Cart (0)', exact: true })).toBeVisible();
  const saved = (await database(page, 'list'))[0];
  expect(saved.total).toBe(6490);
  await page.getByRole('button', { name: 'Copy order', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Order copied. You can now send it to the seller.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('alex@example.com');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('order-confirmation.png'), fullPage: true });
  await database(page, 'delete');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Order summary', exact: true })).toContainText('Sneakers Red Runner');
  await expect(page.locator('.total')).toHaveText('Total: 6,490 units');
  await page.getByRole('link', { name: 'My orders', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'My orders', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: saved.number, exact: true })).toBeVisible();
  await page.getByRole('link', { name: saved.number, exact: true }).click();
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('uk');
  await expect(page.getByRole('heading', { name: 'Замовлення збережено', exact: true })).toBeVisible();
});

test('rechecks current prices and preserves contact fields for explicit reconfirmation', async ({ page }) => {
  await prepareCheckout(page);
  await contacts(page);
  await database(page, 'price');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('The catalog has changed. Review your items and total, then confirm again.');
  expect(await database(page, 'list')).toHaveLength(0);
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Alex Test');
  await expect(page.getByRole('textbox', { name: 'Email', exact: true })).toHaveValue('alex@example.com');
  await expect(page.locator('.total')).toHaveText('Total: 7,000 units');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  expect((await database(page, 'list'))[0].total).toBe(7000);
});

test('keeps the cart after a write failure and avoids duplicates when a saved attempt is retried', async ({ page }) => {
  await page.addInitScript(() => {
    const add = IDBObjectStore.prototype.add;
    window.denyOrderWrites = true;
    IDBObjectStore.prototype.add = function (...args) {
      if (this.name === 'orders' && window.denyOrderWrites) throw new DOMException('Storage full', 'QuotaExceededError');
      return add.apply(this, args);
    };
  });
  await prepareCheckout(page);
  await contacts(page);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not save the order. Your cart has been kept. Please try again.');
  await expect(page.getByRole('link', { name: 'Cart (1)', exact: true })).toBeVisible();
  expect(await database(page, 'list')).toHaveLength(0);
  const attempt = await page.evaluate(() => JSON.parse(localStorage.getItem('fartoviy-checkout-attempt')));
  await page.evaluate(() => { window.denyOrderWrites = false; });
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  expect((await database(page, 'list'))[0].id).toBe(attempt.id);
  // Simulate a reload after order commit but before the previous cart was cleared.
  await page.evaluate(() => localStorage.setItem('fartoviy-cart', JSON.stringify([{ id: 'runner', size: '37', qty: 1 }])));
  await page.goto('#/checkout');
  await page.reload();
  await contacts(page);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  expect(await database(page, 'list')).toHaveLength(1);
  await page.evaluate(() => { window.denyOrderWrites = false; });
  await prepareCheckout(page);
  await contacts(page);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  expect(await database(page, 'list')).toHaveLength(2);
});

test('does not order deleted items or allow checkout of an empty cart', async ({ page }) => {
  await page.goto('#/checkout');
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save order', exact: true })).toHaveCount(0);
  await prepareCheckout(page);
  await contacts(page);
  await database(page, 'delete');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('The catalog has changed. Review your items and total, then confirm again.');
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  expect(await database(page, 'list')).toHaveLength(0);
});

test('requires valid contacts and shows missing orders clearly', async ({ page }) => {
  await prepareCheckout(page);
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  expect(await page.locator('#customer-name').evaluate(input => input.validity.valueMissing)).toBe(true);
  expect(await database(page, 'list')).toHaveLength(0);
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('   ');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('alex@example.com');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter your name and a valid email. Check the length of the completed fields.');
  expect(await database(page, 'list')).toHaveLength(0);
  await page.goto('#/orders/missing');
  await expect(page.getByRole('heading', { name: 'Order not found', exact: true })).toBeVisible();
});
