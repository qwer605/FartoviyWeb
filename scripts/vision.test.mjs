import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodeSegments, INPUT_SIZE, OBJECT_LABELS, resizedGeometry, rgbaToTensor, maskOverlay } from '../src/app/core/vision.ts';

const protoDims = [1, 32, 160, 160];
const prototypes = new Float32Array(32 * 160 * 160);
prototypes.fill(1, 0, 160 * 160);
const row = (bounds, confidence = .9, classId = 26, coefficient = 1) => [...bounds, confidence, classId, coefficient, ...Array(31).fill(0)];
const decode = (rows, geometry = resizedGeometry(640, 640), proto = prototypes, threshold = .25) =>
  decodeSegments(rows.flat(), [1, rows.length, 38], proto, protoDims, geometry, threshold);

test('resizes images with centered letterbox padding without distorting their aspect ratio', () => {
  assert.deepEqual(resizedGeometry(1200, 600), { width: 640, height: 320, padX: 0, padY: 160 });
  assert.deepEqual(resizedGeometry(300, 600), { width: 320, height: 640, padX: 160, padY: 0 });
  assert.deepEqual(resizedGeometry(100, 100), { width: 640, height: 640, padX: 0, padY: 0 });
  assert.throws(() => resizedGeometry(0, 100));
  assert.throws(() => resizedGeometry(Infinity, 100));
});

test('converts RGBA to normalized RGB channel-first input', () => {
  const pixels = new Uint8ClampedArray(INPUT_SIZE * INPUT_SIZE * 4);
  pixels.set([255, 128, 0, 255]);
  const data = rgbaToTensor(pixels);
  assert.equal(data.length, 3 * INPUT_SIZE * INPUT_SIZE);
  assert.equal(data[0], 1);
  assert.ok(Math.abs(data[INPUT_SIZE * INPUT_SIZE] - 128 / 255) < 1e-6);
  assert.equal(data[2 * INPUT_SIZE * INPUT_SIZE], 0);
  assert.throws(() => rgbaToTensor(new Uint8ClampedArray(4)));
});

test('maps segmentation coordinates back to the original photo and removes centered padding', () => {
  const result = decode([row([64, 192, 320, 320]), row([-20, 100, 700, 700], .8, 24)], resizedGeometry(1200, 600));
  const { mask, ...first } = result[0];
  assert.deepEqual(first, { classId: 26, confidence: .9, x: .1, y: .1, width: .4, height: .4 });
  assert.equal(mask.data[48 * 160 + 16], 255);
  assert.equal(mask.data[0], 0);
  assert.equal(result[1].width, 1);
  assert.equal(result[1].height, 1);
  assert.equal(result[1].mask.data[0], 0);
  assert.equal(result[1].mask.data[40 * 160], 255);
});

test('builds a nonrectangular instance mask from prototype coefficients, cropped to the object', () => {
  const proto = prototypes.slice();
  for (let y = 0; y < 160; y++) for (let x = 0; x < 160; x++) proto[y * 160 + x] = x > y ? 1 : -1;
  const [result] = decode([row([40, 40, 600, 600])], resizedGeometry(640, 640), proto);
  assert.equal(result.mask.data[20 * 160 + 100], 255);
  assert.equal(result.mask.data[100 * 160 + 20], 0);
  assert.equal(result.mask.data[0 * 160 + 100], 0);
  assert.equal(result.mask.data[20 * 160 + 155], 0);
  const overlay = maskOverlay([result]);
  assert.ok(overlay[(20 * 160 + 100) * 4 + 3] > 0);
  assert.equal(overlay[(100 * 160 + 20) * 4 + 3], 0);
  assert.deepEqual(decode([row([0, 0, 640, 640], .9, 26, -1)]), []);
});

test('rejects low confidence, malformed outputs, invalid coefficients and boxes outside the image', () => {
  const rows = [row([1, 1, 20, 20], .1), row([1, 1, 20, 20], .9, 80), row([1, 1, 20, 20], .9, -1),
    row([NaN, 1, 20, 20]), row([10, 10, 5, 5]), row([1, 1, 20, 20], NaN),
    row([1, 1, 20, 20], 1.1), row([1, 1, 20, 20], .9, 26, NaN), row([1, 500, 20, 600])];
  assert.deepEqual(decode(rows, resizedGeometry(1200, 600)), []);
  assert.throws(() => decodeSegments([], [1, 300, 6], prototypes, protoDims, resizedGeometry(640, 640)));
  assert.throws(() => decodeSegments([], [1, 0, 38], [], [1, 32, 80, 80], resizedGeometry(640, 640)));
  assert.throws(() => decode([], resizedGeometry(640, 640), prototypes, NaN));
});

test('keeps at most 30 masks ordered by confidence and supports a lower confidence threshold', () => {
  const rows = Array.from({ length: 40 }, (_, i) => row([0, 0, 100, 100], .4 + i / 100, 24));
  const result = decode(rows);
  assert.equal(result.length, 30);
  assert.ok(result[0].confidence > result[29].confidence);
  assert.equal(decode([row([0, 0, 100, 100], .2)]).length, 0);
  assert.equal(decode([row([0, 0, 100, 100], .2)], resizedGeometry(640, 640), prototypes, .15).length, 1);
});

test('bundles the verified official segmentation model and the correct translated COCO labels', () => {
  assert.equal(OBJECT_LABELS.length, 80);
  assert.deepEqual(OBJECT_LABELS[24], ['backpack', 'рюкзак', 'рюкзак']);
  assert.equal(OBJECT_LABELS[26][0], 'handbag');
  for (const labels of OBJECT_LABELS) assert.equal(labels.filter(Boolean).length, 3);
  const hash = createHash('sha256').update(readFileSync(new URL('../public/models/yolo26s-seg.onnx', import.meta.url))).digest('hex');
  assert.equal(hash, 'd205b2c489e7cf0cdb183bb23e56dc8a32a79602e8c5b1f5ecb01af0dc6822c3');
});
