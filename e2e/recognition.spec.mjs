import { test, expect } from '@playwright/test';

test('checks a real bag-like mask with automatic settings and clears results for the next photo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/recognize');
  await expect(page.getByRole('combobox', { name: 'Search mode', exact: true })).toHaveCount(0);
  await expect(page.getByRole('slider')).toHaveCount(0);
  await page.locator('input[type=file]').setInputFiles('public/assets/backpack.jpg');
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Candidates with a similar pattern: 0');
  await expect(page.locator('canvas.mask')).toBeVisible();
  expect(await page.locator('canvas.mask').evaluate(canvas => {
    const rgba = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return rgba.some((value, index) => index % 4 === 3 && value > 0);
  })).toBe(true);
  await expect(page.getByRole('checkbox', { name: 'Show masks', exact: true })).toHaveCount(0);
  await expect(page.locator('.candidate-list, .object-label')).toHaveCount(0);
  await expect(page.getByText('Original YOLO class', { exact: false })).toHaveCount(0);
  await expect(page.getByText('Pattern coverage inside the mask', { exact: false })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Language', exact: true }).selectOption('uk');
  await expect(page.getByRole('status')).toHaveText('Кандидатів зі схожим візерунком: 0');
  await page.getByRole('combobox', { name: 'Мова', exact: true }).selectOption('en');
  await page.locator('input[type=file]').setInputFiles('public/assets/vision-sample.jpg');
  await expect(page.getByRole('button', { name: 'Recognize', exact: true })).toBeEnabled();
  await expect(page.getByRole('status')).toHaveText('');
  expect(await page.locator('canvas.mask').evaluate(canvas => !canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some(Boolean))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('runs real ONNX inference on a bundled photo without external requests', async ({ page }, testInfo) => {
  const external = [];
  const errors = [];
  page.on('request', request => { if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:4173/')) external.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('#/recognize');
  await page.getByRole('button', { name: 'Try an example', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Selected photo' })).toBeVisible();
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Candidates with a similar pattern: 0');
  await expect(page.getByText('No suitable regions found. Try another photo or angle.')).toBeVisible();
  expect(await page.locator('canvas.mask').evaluate(canvas => !canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.some(Boolean))).toBe(true);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('recognition.png'), fullPage: true });
  await page.getByRole('combobox', { name: 'Language' }).selectOption('uk');
  await expect(page.getByText('Відповідних областей не знайдено. Спробуйте інше фото або ракурс.')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk');
});

test('handles invalid images and zero detections on a mobile screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('#/recognize');
  await page.locator('input[type=file]').setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('alert')).toHaveText('Could not open the photo. Choose another image.');
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 640;
    const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, 640, 640);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'blank.png', mimeType: 'image/png', buffer: Buffer.from(image, 'base64') });
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByText('No suitable regions found. Try another photo or angle.')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('recovers from a model download failure', async ({ page }) => {
  await page.route('**/models/*.onnx', route => route.abort());
  await page.goto('#/recognize');
  await page.getByRole('button', { name: 'Try an example', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Recognize', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Recognition failed. Please try again.');
  await page.unroute('**/models/*.onnx');
  await page.getByRole('button', { name: 'Recognize', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Candidates with a similar pattern: 0');
  await expect(page.getByText('No suitable regions found. Try another photo or angle.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
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
