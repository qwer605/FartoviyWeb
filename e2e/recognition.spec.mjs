import { test, expect } from '@playwright/test';

const bag = 'public/assets/checker-bag.jpg';
const searchButton = page => page.getByRole('button', { name: 'Search by photo', exact: true });
const dialog = page => page.getByRole('dialog', { name: 'Find a bag by its pattern', exact: true });
const upload = page => dialog(page).locator('input[type=file]');

async function denyCamera(page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
  });
}

async function openSearch(page) {
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 9', { exact: true })).toBeVisible();
  await searchButton(page).click();
  await expect(dialog(page)).toBeVisible();
}

test('camera icon opens live search on the current page; close stops every camera track', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.cameraRequests = [];
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.cameraRequests.push(constraints);
      const stream = await original(constraints);
      window.cameraTracks = stream.getTracks();
      return stream;
    };
  });
  await page.goto('#/catalog');
  expect(await page.evaluate(() => window.cameraRequests.length)).toBe(0);
  await expect(page.getByRole('link', { name: 'Recognition', exact: true })).toHaveCount(0);
  await searchButton(page).click();
  await expect(dialog(page).locator('video')).toBeVisible();
  await expect(dialog(page).getByRole('status')).toHaveText('No pattern found yet. Move closer or try another angle.');
  await expect(page).toHaveURL(/#\/catalog$/);
  expect(await page.evaluate(() => window.cameraRequests[0])).toEqual({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Close search', exact: true }).click();
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.cameraTracks.every(track => track.readyState === 'ended'))).toBe(true);
  await expect(searchButton(page)).toBeFocused();
});

test('real live camera-frame inference opens the bag page automatically and releases the camera', async ({ page }, testInfo) => {
  const external = [];
  page.on('request', request => { if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  // Supply the actual bag photo as a MediaStream. YOLO, WASM and texture checks stay real.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.cameraConstraints = constraints;
      const image = new Image();
      image.src = new URL('assets/checker-bag.jpg', document.baseURI).href;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const stream = canvas.captureStream(5);
      window.cameraTracks = stream.getTracks();
      window.cameraCanvas = canvas;
      return stream;
    };
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await openSearch(page);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
  await expect(page.getByRole('heading', { name: 'Checkerboard shoulder bag', exact: true })).toBeVisible();
  await expect(dialog(page)).not.toBeVisible();
  expect(await page.evaluate(() => window.cameraTracks.every(track => track.readyState === 'ended'))).toBe(true);
  expect(external).toEqual([]);
  expect(await page.getByRole('img', { name: 'Checkerboard shoulder bag', exact: true }).evaluate(image => image.complete && image.naturalWidth === 960)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('camera-product-match.png'), fullPage: true });
  await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Product added to cart.');
});

test('denied camera still allows an uploaded bag photo to open the catalog product', async ({ page }) => {
  await denyCamera(page);
  await openSearch(page);
  await expect(dialog(page).getByRole('alert')).toHaveText('Could not open the camera. Allow access, or take and upload a photo.');
  await expect(upload(page)).toHaveAttribute('capture', 'environment');
  await upload(page).setInputFiles(bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
  await expect(page.getByRole('heading', { name: 'Checkerboard shoulder bag', exact: true })).toBeVisible();
});

test('nonmatching and invalid photos stay in the dialog; the next matching photo opens the product', async ({ page }) => {
  await denyCamera(page);
  await openSearch(page);
  await upload(page).setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(dialog(page).getByRole('alert')).toHaveText('Could not process the photo. Choose another image or try again.');
  await upload(page).setInputFiles('public/assets/backpack.jpg');
  await expect(dialog(page).getByRole('status')).toHaveText('No pattern found. Take another photo or try a different angle.');
  await expect(page).toHaveURL(/#\/catalog$/);
  await expect(dialog(page).getByRole('alert')).toHaveCount(0);
  await upload(page).setInputFiles(bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
});

test('model download failure can be retried with the same photo', async ({ page }) => {
  await denyCamera(page);
  await page.route('**/models/*.onnx', route => route.abort());
  await openSearch(page);
  await upload(page).setInputFiles(bag);
  await expect(dialog(page).getByRole('alert')).toHaveText('Could not process the photo. Choose another image or try again.');
  await page.unroute('**/models/*.onnx');
  await upload(page).setInputFiles(bag);
  await expect(page).toHaveURL(/#\/product\/checker-bag$/);
});

test('closing during a pending permission request disposes the late camera stream', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => {
      window.finishCameraRequest = async () => {
        const stream = await original(constraints);
        window.lateTracks = stream.getTracks();
        resolve(stream);
      };
    });
  });
  await openSearch(page);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).not.toBeVisible();
  await page.evaluate(() => window.finishCameraRequest());
  await expect.poll(() => page.evaluate(() => window.lateTracks.every(track => track.readyState === 'ended'))).toBe(true);
  await expect(page).toHaveURL(/#\/catalog$/);
});

test('a missing catalog product does not navigate to a broken product page', async ({ page }) => {
  await denyCamera(page);
  await page.goto('#/catalog');
  await expect(page.getByText('Products: 9', { exact: true })).toBeVisible();
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
  await expect(page.getByText('Products: 8', { exact: true })).toBeVisible();
  await searchButton(page).click();
  await upload(page).setInputFiles(bag);
  await expect(dialog(page).getByRole('alert')).toHaveText('This bag is currently unavailable in the catalog.');
  await expect(page).toHaveURL(/#\/catalog$/);
});

test('backgrounding pauses camera search and navigation closes its dialog', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await original(constraints);
      window.cameraTracks = stream.getTracks();
      return stream;
    };
  });
  await openSearch(page);
  await expect(dialog(page).locator('video')).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(dialog(page).getByRole('status')).toHaveText('Search paused. Enable the camera to continue.');
  expect(await page.evaluate(() => window.cameraTracks.every(track => track.readyState === 'ended'))).toBe(true);
  await page.evaluate(() => { location.hash = '#/cart'; });
  await expect(dialog(page)).not.toBeVisible();
});
