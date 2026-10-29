import { test, expect } from '@playwright/test';

test('checks a real bag-like mask for texture and clears results when the search mode changes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/recognize');
  await expect(page.getByRole('combobox', { name: 'Search mode', exact: true })).toHaveValue('pattern');
  await page.locator('input[type=file]').setInputFiles('public/assets/backpack.jpg');
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Candidates with a similar pattern: 0');
  await expect(page.getByRole('list', { name: 'Mask checks', exact: true })).toContainText('Original YOLO class: suitcase');
  await expect(page.getByRole('list', { name: 'Mask checks', exact: true })).toContainText('No checker pattern found.');
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('uk');
  await expect(page.getByRole('list', { name: 'Перевірка масок', exact: true })).toContainText('Шаховий візерунок не знайдено.');
  await page.getByRole('combobox', { name: 'Мова', exact: true }).selectOption('en');
  await page.getByRole('combobox', { name: 'Search mode', exact: true }).selectOption('objects');
  await expect(page.getByRole('list', { name: 'Mask checks', exact: true })).toHaveCount(0);
  expect(await page.locator('canvas.mask').evaluate(canvas => !canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some(Boolean))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runs real ONNX inference on a bundled photo without external requests', async ({ page }, testInfo) => {
  const external = [];
  const errors = [];
  page.on('request', request => { if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('#/recognize');
  await page.getByRole('combobox', { name: 'Search mode', exact: true }).selectOption('objects');
  await page.getByRole('button', { name: 'Try an example', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Selected photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Detected objects' })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Detected objects' })).toContainText('person');
  await expect(page.getByRole('list', { name: 'Detected objects' })).toContainText('bus');
  await expect(page.locator('.object-label')).not.toHaveCount(0);
  expect(await page.locator('canvas.mask').evaluate(canvas => {
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return rgba.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await page.getByRole('checkbox', { name: 'Show masks', exact: true }).uncheck();
  await expect(page.locator('canvas.mask')).toBeHidden();
  await page.getByRole('checkbox', { name: 'Show masks', exact: true }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('recognition.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Language' }).selectOption('uk');
  await expect(page.getByRole('list', { name: 'Знайдені об’єкти' })).toContainText('людина');
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
});

test('handles invalid images and zero detections on a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/recognize');
  await page.getByRole('combobox', { name: 'Search mode', exact: true }).selectOption('objects');
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toHaveText('Could not open the photo. Choose another image.');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 640;
    const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 640, 640);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByText('No objects found. Try another photo or take a picture with better lighting.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recovers from a model download failure', async ({ page }) => {
  await page.route('**/models/*.onnx', route => route.abort());
  await page.goto('#/recognize');
  await page.getByRole('combobox', { name: 'Search mode', exact: true }).selectOption('objects');
  await page.getByRole('button', { name: 'Try an example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recognize', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Recognition failed. Please try again.');
  await page.unroute('**/models/*.onnx');
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Detected objects' })).toBeVisible();
});

test('captures a camera frame and releases the camera tracks', async ({ page }) => {
  await page.addInitScript(() => {
    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async constraints => {
      const stream = await getUserMedia(constraints);
      window.cameraTestTracks = stream.getTracks();
      return stream;
    };
  });
  await page.goto('#/recognize');
  await page.getByRole('button', { name: 'Open camera', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Take picture', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Take picture', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Selected photo' })).toBeVisible();
  await expect(page.locator('video')).toBeHidden();
  expect(await page.evaluate(() => window.cameraTestTracks.every(track => track.readyState === 'ended'))).toBe(true);
  await expect(page.getByRole('button', { name: 'Recognize', exact: true })).toBeEnabled();
});
