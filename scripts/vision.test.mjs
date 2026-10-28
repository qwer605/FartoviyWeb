import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { decodeDetections, INPUT_SIZE, OBJECT_LABELS, resizedGeometry, rgbaToTensor } from '../src/app/core/vision.ts';

test('resizes portrait and landscape images without distorting their aspect ratio', () => {
  assert.deepEqual(resizedGeometry(1200, 600), { width: 640, height: 320 });
  assert.deepEqual(resizedGeometry(300, 600), { width: 320, height: 640 });
  assert.deepEqual(resizedGeometry(100, 100), { width: 640, height: 640 });
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

test('maps output coordinates to the original aspect ratio and removes padding', () => {
  const result = decodeDetections([64, 32, 320, 160, 0.9, 24, -20, -10, 700, 500, 0.8, 0], [1, 2, 6], { width: 640, height: 320 });
  assert.deepEqual(result[0], { classId: 24, confidence: 0.9, x: 0.1, y: 0.1, width: 0.4, height: 0.4 });
  assert.deepEqual(result[1], { classId: 0, confidence: 0.8, x: 0, y: 0, width: 1, height: 1 });
});

test('rejects low confidence, invalid classes, nonfinite coordinates and empty boxes', () => {
  const rows = [
    [1, 1, 20, 20, 0.1, 0], [1, 1, 20, 20, 0.9, 80], [1, 1, 20, 20, 0.9, -1],
    [NaN, 1, 20, 20, 0.9, 0], [10, 10, 5, 5, 0.9, 0], [1, 1, 20, 20, NaN, 0],
    [1, 1, 20, 20, 1.1, 0], [1, 500, 20, 600, 0.9, 0]
  ];
  assert.deepEqual(decodeDetections(rows.flat(), [1, rows.length, 6], { width: 640, height: 320 }), []);
  assert.throws(() => decodeDetections([1, 2, 3], [1, 84, 8400], { width: 640, height: 640 }));
});

test('keeps at most 30 detections ordered by confidence', () => {
  const rows = Array.from({ length: 40 }, (_, i) => [0, 0, 100, 100, 0.4 + i / 100, 24]);
  const result = decodeDetections(rows.flat(), [1, rows.length, 6], { width: 640, height: 640 });
  assert.equal(result.length, 30);
  assert.ok(result[0].confidence > result[29].confidence);
});

test('bundles the verified model with the correct COCO class order and translated labels', () => {
  assert.equal(OBJECT_LABELS.length, 80);
  assert.deepEqual(OBJECT_LABELS[24], ['backpack', 'рюкзак', 'рюкзак']);
  assert.equal(OBJECT_LABELS[26][0], 'handbag');
  for (const labels of OBJECT_LABELS) assert.equal(labels.filter(Boolean).length, 3);
  const hash = createHash('sha256').update(readFileSync(new URL('../public/models/yolov10n-uint8.onnx', import.meta.url))).digest('hex');
  assert.equal(hash, '85630e74204ebed54bf990274f45625bdaae4d46f179bf072b5fda3ccf36a42e');
});
