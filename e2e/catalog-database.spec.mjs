import { test, expect } from '@playwright/test';

// Exercise native IndexedDB in the browser, independently of the repository implementation.
async function changeCatalog(page, operation) {
  await page.evaluate(async operation => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('fartoviy-products', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('products', 'readwrite');
        const store = transaction.objectStore('products');
        if (operation === 'clear') store.clear();
        else if (operation === 'delete') store.delete('local-bag');
        else {
          const get = store.get('runner');
          get.onsuccess = () => {
            store.put(operation === 'edit'
              ? { ...get.result, name: 'Local Red Runner', price: 1234 }
              : { ...get.result, id: 'local-bag', name: 'Local Bag', price: 99, sizes: ['One size'] });
          };
        }
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
      };
    });
  }, operation);
}

test('reads persisted edits in the catalog, product page and cart after reload', async ({ page }) => {
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 8', { exact: true })).toBeVisible();
  await changeCatalog(page, 'edit');
  await page.reload();
  await page.getByRole('heading', { name: 'Local Red Runner', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Local Red Runner', exact: true })).toBeVisible();
  await expect(page.getByText('1,234 units', { exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Size', exact: true }).selectOption('38');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'Go to cart', exact: true }).click();
  await page.reload();
  await expect(page.locator('.total')).toHaveText('Total: 1,234 units');
  await expect(page.getByRole('heading', { name: 'Local Red Runner', exact: true })).toBeVisible();
});

test('restores cart entries for locally added products and removes deleted references', async ({ page }) => {
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 8', { exact: true })).toBeVisible();
  await changeCatalog(page, 'add');
  await page.evaluate(() => localStorage.setItem('fartoviy-cart', JSON.stringify([{ id: 'local-bag', size: 'One size', qty: 2 }])));
  await page.goto('#/cart');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Local Bag', exact: true })).toBeVisible();
  await expect(page.locator('.total')).toHaveText('Total: 198 units');
  await changeCatalog(page, 'delete');
  await page.reload();
  await expect(page.getByText('Your cart is empty.', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('fartoviy-cart')))).toEqual([]);
});

test('keeps an empty catalog empty instead of reseeding on each visit', async ({ page }) => {
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 8', { exact: true })).toBeVisible();
  await changeCatalog(page, 'clear');
  for (let i = 0; i < 2; i++) {
    await page.reload();
    await expect(page.getByText('Products: 0', { exact: true })).toBeVisible();
    await expect(page.getByText('There are no products in the catalog yet.', { exact: true })).toBeVisible();
  }
});

test('retains the saved cart while storage is unavailable and recovers on retry', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fartoviy-cart', JSON.stringify([{ id: 'runner', size: '37', qty: 2 }]));
    const open = indexedDB.open.bind(indexedDB);
    window.denyCatalogStorage = true;
    indexedDB.open = (...args) => {
      if (window.denyCatalogStorage) throw new DOMException('Storage denied', 'SecurityError');
      return open(...args);
    };
  });
  await page.goto('#/cart');
  await expect(page.getByRole('alert')).toHaveText('Could not open the local catalog. Please try again.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fartoviy-cart')))).toEqual([{ id: 'runner', size: '37', qty: 2 }]);
  await page.evaluate(() => { window.denyCatalogStorage = false; });
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.locator('.total')).toHaveText('Total: 12,980 units');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
