import assert from 'node:assert/strict';
import test from 'node:test';
import { findColorRegionTexture } from '../src/app/core/color-regions.ts';
import { checkBagPattern } from '../src/app/core/bag-pattern.ts';
import { resizedGeometry } from '../src/app/core/vision.ts';

const side = 160;
function image(sample, size = side) {
  const rgba = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const color = sample(x, y);
    rgba.set(Array.isArray(color) ? color : [color, color, color, 255], (y * size + x) * 4);
  }
  return rgba;
}
const checker = (x, y) => ((Math.floor(x / 16) + Math.floor(y / 16)) % 2 + 2) % 2 ? 190 : 65;

test('region graph detects checker patches at arbitrary rotations and stretched proportions', () => {
  for (const degrees of [0, 23, 45, 77, 123]) {
    const angle = degrees * Math.PI / 180;
    const rgba = image((x, y) => checker(x * Math.cos(angle) - y * Math.sin(angle),
      (x * Math.sin(angle) + y * Math.cos(angle)) * .65));
    const result = findColorRegionTexture(rgba, side, side);
    assert.ok(result.coverage > .08, `Missing region pattern at ${degrees} degrees: ${result.coverage}`);
  }
});

test('region graph tolerates perspective, curved cells, shading and partial occlusion', () => {
  const cases = {
    perspective: (x, y) => checker((x - 80) / (1 + y / 180) + 80, y * .8),
    folds: (x, y) => checker(x + 7 * Math.sin(y / 22), y + 5 * Math.sin(x / 27)) * (.6 + .4 * x / side),
    occlusion: (x, y) => x > 95 && y < 110 ? 125 : checker(x, y),
    'colored fabric': (x, y) => checker(x, y) > 100 ? [177, 145, 102, 255] : [89, 65, 43, 255],
  };
  for (const [name, sample] of Object.entries(cases)) {
    const result = findColorRegionTexture(image(sample), side, side);
    assert.ok(result.coverage > .05, `Missing ${name}: ${result.coverage}`);
  }
});

test('region graph rejects flat colors, shading, rotated stripes, spots and one isolated cross', () => {
  const samples = [
    () => 120,
    (x, y) => 50 + x * .5 + y * .2,
    (x, y) => (Math.floor((x + y) / 16) % 2 ? 190 : 65),
    (x, y) => Math.hypot(x % 32 - 16, y % 32 - 16) < 7 ? 65 : 190,
    (x, y) => {
      const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
      return cx === 2 && cy === 2 ? 190 : Math.abs(cx - 2) + Math.abs(cy - 2) === 1 ? 65 : 125;
    },
  ];
  for (const [index, sample] of samples.entries()) {
    assert.equal(findColorRegionTexture(image(sample), side, side).coverage, 0, `False match on negative ${index}`);
  }
});

test('outside-mask colors cannot influence region segmentation or paint; transparent texture is ignored', () => {
  const allowed = Uint8Array.from({ length: side * side }, (_, p) => {
    const x = p % side, y = Math.floor(p / side);
    return x >= 32 && x < 128 && y >= 32 && y < 128 ? 255 : 0;
  });
  const inside = (x, y) => allowed[y * side + x];
  const first = findColorRegionTexture(image((x, y) => inside(x, y) ? checker(x, y) : 0), side, side, allowed);
  const second = findColorRegionTexture(image((x, y) => inside(x, y) ? checker(x, y) : 255), side, side, allowed);
  assert.ok(first.coverage > .03);
  assert.deepEqual(first.mask, second.mask);
  first.mask.forEach((value, p) => { if (!allowed[p]) assert.equal(value, 0); });
  assert.equal(findColorRegionTexture(image((x, y) => inside(x, y) ? 125 : checker(x, y)), side, side, allowed).coverage, 0);
  assert.equal(findColorRegionTexture(image((x, y) => [checker(x, y), 0, 0, 0]), side, side).coverage, 0);
});

test('experimental method works through the bag pipeline with letterbox geometry and stays inside its mask', () => {
  const geometry = resizedGeometry(640, 400);
  const mask = new Uint8Array(160 * 160);
  for (let y = 45; y < 115; y++) for (let x = 30; x < 130; x++) mask[y * 160 + x] = 255;
  const proposal = { classId: 26, confidence: .8, x: .1875, y: .15, width: .625, height: .7,
    mask: { width: 160, height: 160, data: mask } };
  const sample = image((x, y) => checker(x / 2, y / 2), 640);
  const result = checkBagPattern(sample, geometry, proposal, 'regions');
  assert.equal(result.matched, true);
  assert.ok(result.coverage > .05 && result.coverage <= 1);
  assert.equal(result.texture.width, 512);
  assert.equal(result.texture.height, 320);
});

test('region detector validates dimensions and handles tiny images', () => {
  assert.throws(() => findColorRegionTexture(new Uint8ClampedArray(4), 160, 160));
  assert.throws(() => findColorRegionTexture(image(() => 100), side, side, new Uint8Array(1)));
  assert.equal(findColorRegionTexture(new Uint8ClampedArray([100, 100, 100, 255]), 1, 1).coverage, 0);
});

test('fine random noise and a single four-cell checker do not provide repeated region evidence', () => {
  let seed = 42;
  const noise = image(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed >>> 24;
  });
  assert.equal(findColorRegionTexture(noise, side, side).coverage, 0);
  const fourCells = image((x, y) => x >= 48 && x < 112 && y >= 48 && y < 112
    ? (Math.floor((x - 48) / 32) + Math.floor((y - 48) / 32)) % 2 ? 190 : 65 : 125);
  assert.equal(findColorRegionTexture(fourCells, side, side).coverage, 0);
});
