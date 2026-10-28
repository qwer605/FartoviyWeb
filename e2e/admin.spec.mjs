import { test, expect } from '@playwright/test';

async function admin(page) {
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Products (8)', exact: true })).toBeVisible();
}

function row(page, name) { return page.locator('.products li').filter({ has: page.getByText(name, { exact: true }) }); }

async function fillProduct(page, id = 'local-bag') {
  await page.getByLabel('Product ID', { exact: true }).fill(id);
  await page.getByLabel('Product name', { exact: true }).fill('Local Bag');
  await page.getByLabel('Category label', { exact: true }).fill('Bags');
  await page.getByLabel('Price', { exact: true }).fill('12.34');
  await page.getByLabel('Sizes separated by commas', { exact: true }).fill('S, M, S');
  await page.getByLabel('Image address', { exact: true }).fill('assets/bag.jpg');
  await page.getByLabel('Description', { exact: true }).fill('A local test bag.');
}

test('creates a product with an uploaded photo, edits it and persists changes on mobile', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/admin');
  await expect(page.getByRole('button', { name: 'Products (8)', exact: true })).toBeVisible();
  await fillProduct(page);
  await page.getByLabel('Upload photo', { exact: true }).setInputFiles('public/assets/bag.jpg');
  await expect(page.getByRole('img', { name: 'Product photo', exact: true })).toHaveAttribute('src', /^data:image\/webp;base64,/);
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product saved.');
  await expect(page.getByLabel('Product ID', { exact: true })).toHaveAttribute('readonly');
  await expect(page.getByRole('button', { name: 'Products (9)', exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Search by name or ID', { exact: true }).fill('local-bag');
  await expect(page.locator('.products li')).toHaveCount(1);
  await row(page, 'Local Bag').getByRole('button', { name: 'Edit', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Product photo', exact: true })).toHaveAttribute('src', /^data:image\/webp;base64,/);
  await page.getByLabel('Price', { exact: true }).fill('15.50');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product saved.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('admin-mobile.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('uk');
  await expect(page.getByRole('heading', { name: 'Керування', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Мова', exact: true }).selectOption('en');
  await page.goto('#/product/local-bag');
  await expect(page.getByRole('heading', { name: 'Local Bag', exact: true })).toBeVisible();
  await expect(page.getByText('15.5 units', { exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Size', exact: true }).locator('option')).toHaveCount(2);
});

test('rejects duplicate IDs and preserves edits after a transaction fails', async ({ page }) => {
  await page.addInitScript(() => {
    const put = IDBObjectStore.prototype.put;
    window.denyProductWrites = false;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === 'products' && window.denyProductWrites) throw new DOMException('Storage full', 'QuotaExceededError');
      return put.apply(this, args);
    };
  });
  await page.goto('#/admin');
  await expect(page.getByRole('button', { name: 'Products (8)', exact: true })).toBeVisible();
  await fillProduct(page, 'runner');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('A product with this ID already exists. Choose another ID.');
  page.once('dialog', dialog => dialog.accept());
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Price', { exact: true }).fill('99');
  await page.evaluate(() => { window.denyProductWrites = true; });
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Could not save the product. Your form changes have been kept. Please try again.');
  await expect(page.getByLabel('Price', { exact: true })).toHaveValue('99');
  await expect(row(page, 'Sneakers Red Runner')).toContainText('6,490 units');
  await page.evaluate(() => { window.denyProductWrites = false; });
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product saved.');
  await page.reload();
  await expect(row(page, 'Sneakers Red Runner')).toContainText('99 units');
});

test('updates cart prices and prunes removed sizes and deleted products after confirmation', async ({ page }) => {
  await page.goto('#/product/runner');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await admin(page);
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Price', { exact: true }).fill('100');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product saved.');
  await page.getByRole('link', { name: 'Cart (1)', exact: true }).click();
  await expect(page.locator('.total')).toHaveText('Total: 100 units');
  await admin(page);
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByLabel('Sizes separated by commas', { exact: true }).fill('38, 39');
  await page.getByRole('button', { name: 'Save product', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product saved.');
  await expect(page.getByRole('link', { name: 'Cart (0)', exact: true })).toBeVisible();
  page.once('dialog', dialog => dialog.dismiss());
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(row(page, 'Sneakers Red Runner')).toBeVisible();
  page.once('dialog', dialog => dialog.accept());
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product deleted.');
  await expect(page.getByRole('button', { name: 'Products (7)', exact: true })).toBeVisible();
  await page.reload();
  await expect(row(page, 'Sneakers Red Runner')).toHaveCount(0);
});

test('shows local orders and preserves their details after deleting a catalog product', async ({ page }) => {
  await page.goto('#/product/runner');
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await page.getByRole('link', { name: 'Cart (1)', exact: true }).click();
  await page.getByRole('link', { name: 'Checkout', exact: true }).click();
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Admin Test');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('admin-test@example.com');
  await page.getByRole('button', { name: 'Save order', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  await admin(page);
  page.once('dialog', dialog => dialog.accept());
  await row(page, 'Sneakers Red Runner').getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product deleted.');
  await page.getByRole('button', { name: 'Orders', exact: true }).click();
  await expect(page.locator('.orders li')).toHaveCount(1);
  await expect(page.locator('.orders li')).toContainText('admin-test@example.com');
  await page.locator('.orders li a').click();
  await expect(page.getByRole('heading', { name: 'Order saved', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Order summary', exact: true })).toContainText('Sneakers Red Runner');
  await expect(page.locator('.total')).toHaveText('Total: 6,490 units');
});
