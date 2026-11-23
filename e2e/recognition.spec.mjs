import { test, expect } from '@playwright/test';

const bag = 'public/assets/checker-bag.jpg';
const search = page => page.locator('shop-camera-search');
const cameraButton = page => page.getByRole('button', { name: 'Search by photo', exact: true });
const input = page => search(page).locator('input[type=file]');

async function capture(page, file) {
  const chooser = page.waitForEvent('filechooser');
  await cameraButton(page).click();
  await (await chooser).setFiles(file);
}

test('camera icon directly invokes native capture without a popup, video stream or model request', async ({ page }) => {
  await page.addInitScript(() => {
    window.cameraRequests = 0;
    navigator.mediaDevices.getUserMedia = async () => { window.cameraRequests++; throw new Error('Unexpected video request'); };
  });
  const modelRequests = [];
  page.on('request', request => { if (request.url().includes('/models/')) modelRequests.push(request.url()); });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 11', { exact: true })).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await cameraButton(page).click();
  const nativeChooser = await chooser;
  expect(nativeChooser.isMultiple()).toBe(false);
  await expect(input(page)).toHaveAttribute('capture', 'environment');
  await expect(input(page)).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  await expect(page.locator('dialog, video')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/catalog$/);
  expect(await page.evaluate(() => window.cameraRequests)).toBe(0);
  expect(modelRequests).toEqual([]);
  // Cancelling the native picker leaves the catalog intact and permits another tap.
  await nativeChooser.setFiles([]);
  await expect(cameraButton(page)).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a captured bag photo runs real ONNX inference and automatically opens the product', async ({ page }) => {
  const external = [];
  page.on('request', request => { if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  await page.goto('#/catalog');
  await capture(page, bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
  await expect(page.getByRole('heading', { name: 'Louis Vuitton Galliera Damier Azur', exact: true })).toBeVisible();
  await expect(search(page).getByRole('status')).toHaveCount(0);
  expect(external).toEqual([]);
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product added to cart.');
  await page.getByRole('link', { name: 'Go to cart', exact: true }).click();
  await expect(page.locator('.total')).toHaveText('Total: €3,490');
});

test('nonmatching or invalid photos stay on the current page and can be replaced by another capture', async ({ page }) => {
  await page.goto('#/catalog');
  await capture(page, { name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(search(page).getByRole('alert')).toHaveText('Could not process the photo. Choose another image or try again.');
  await capture(page, 'public/assets/backpack.jpg');
  await expect(search(page).getByRole('status')).toHaveText('No pattern found. Take another photo or try a different angle.');
  await expect(page).toHaveURL(/#\/catalog$/);
  await expect(search(page).getByRole('alert')).toHaveCount(0);
  await capture(page, bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
});

test('a failed model download can be retried with the same captured photo', async ({ page }) => {
  await page.route('**/models/*.onnx', route => route.abort());
  await page.goto('#/catalog');
  await capture(page, bag);
  await expect(search(page).getByRole('alert')).toHaveText('Could not process the photo. Choose another image or try again.');
  await page.unroute('**/models/*.onnx');
  await capture(page, bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
});

test('cancelling processing discards its result and allows a fresh capture', async ({ page }) => {
  let releaseDownload;
  const gate = new Promise(resolve => { releaseDownload = resolve; });
  let signalDownload;
  const downloadStarted = new Promise(resolve => { signalDownload = resolve; });
  await page.route('**/models/*.onnx', async route => {
    signalDownload();
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('#/catalog');
  await capture(page, bag);
  await downloadStarted;
  await expect(cameraButton(page)).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel search', exact: true }).click();
  releaseDownload();
  await page.unroute('**/models/*.onnx');
  await expect(cameraButton(page)).toBeEnabled();
  await expect(search(page).getByRole('status')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/catalog$/);
  await capture(page, bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
});

test('navigation cancels pending photo processing without a later product redirect', async ({ page }) => {
  let releaseDownload;
  const gate = new Promise(resolve => { releaseDownload = resolve; });
  let signalDownload;
  const started = new Promise(resolve => { signalDownload = resolve; });
  await page.route('**/models/*.onnx', async route => {
    signalDownload();
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('#/catalog');
  await capture(page, bag);
  await started;
  await page.getByRole('link', { name: 'Cart (0)', exact: true }).click();
  releaseDownload();
  await page.unroute('**/models/*.onnx');
  await expect(page).toHaveURL(/#\/cart$/);
  await expect(cameraButton(page)).toBeEnabled();
  await expect(search(page).getByRole('status')).toHaveCount(0);
});

test('a missing catalog product does not navigate to a broken page after capture', async ({ page }) => {
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 11', { exact: true })).toBeVisible();
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('fartoviy-products');
    request.onsuccess = () => {
      const db = request.result, transaction = db.transaction('products', 'readwrite');
      transaction.objectStore('products').delete('checker-bag');
      transaction.oncomplete = () => { db.close(); resolve(); };
      transaction.onabort = () => reject(transaction.error);
    };
  }));
  await page.reload();
  await expect(page.getByText('Products: 10', { exact: true })).toBeVisible();
  await capture(page, bag);
  await expect(search(page).getByRole('alert')).toHaveText('This bag is currently unavailable in the catalog.');
  await expect(page).toHaveURL(/#\/catalog$/);
});
