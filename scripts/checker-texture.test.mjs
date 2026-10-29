import assert from 'node:assert/strict';
import test from 'node:test';
import {findCheckerTexture} from '../src/app/core/checker-texture.ts';
import {checkBagPattern, patternCandidates} from '../src/app/core/bag-pattern.ts';
import {resizedGeometry} from '../src/app/core/vision.ts';

function pixels(width, height, color) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) rgba.set([color(x, y), color(x, y), color(x, y), 255], (y * width + x) * 4);
  return rgba;
}
const checker = (x, y) => (Math.floor(x / 12) + Math.floor(y / 12)) % 2 ? 180 : 70;

test('finds repeated cells across rotation and unequal cell widths', () => {
  for (const angle of [0, Math.PI / 12, Math.PI / 4]) {
    const image = pixels(128, 128, (x, y) => checker(x * Math.cos(angle) - y * Math.sin(angle), (x * Math.sin(angle) + y * Math.cos(angle)) * .6));
    const result = findCheckerTexture(image, 128, 128);
    assert.ok(result.coverage > .03, 'Missing checker texture at angle ' + angle);
    assert.ok(result.regions.length);
    assert.ok(result.mask.some(Boolean));
  }
});

test('rejects solid colors, gradual shading and stripes without two-dimensional alternation', () => {
  for (const color of [() => 150, (x, y) => 50 + x / 2 + y / 2, x => Math.floor(x / 12) % 2 ? 180 : 70]) {
    assert.equal(findCheckerTexture(pixels(128, 128, color), 128, 128).regions.length, 0);
  }
  assert.throws(() => findCheckerTexture(new Uint8ClampedArray(4), 128, 128));
});

function proposal(classId = 26, confidence = .8) {
  const mask = new Uint8Array(160 * 160);
  for (let y = 40; y < 120; y++) for (let x = 40; x < 120; x++) mask[y * 160 + x] = 255;
  return {classId, confidence, x: .25, y: .25, width: .5, height: .5, mask: {width: 160, height: 160, data: mask}};
}

test('checks texture only inside the instance mask and ignores checkerboard backgrounds', () => {
  const backgroundOnly = pixels(640, 640, (x, y) => x >= 160 && x < 480 && y >= 160 && y < 480 ? 150 : checker(x, y));
  const noMatch = checkBagPattern(backgroundOnly, resizedGeometry(640, 640), proposal());
  assert.equal(noMatch.matched, false);
  assert.equal(noMatch.coverage, 0);
  const result = checkBagPattern(pixels(640, 640, checker), resizedGeometry(640, 640), proposal());
  assert.equal(result.matched, true);
  for (let y = 0; y < result.texture.height; y++) for (let x = 0; x < result.texture.width; x++) {
    if (x < 128 || x >= 384 || y < 128 || y >= 384) assert.equal(result.texture.mask[y * result.texture.width + x], 0);
  }
});

test('retains source classes, deduplicates overlapping proposals and limits texture work', () => {
  const tie = proposal(27, .9);
  assert.deepEqual(patternCandidates([proposal(0, .99), proposal(26, .8), tie]), [tie]);
  assert.equal(tie.classId, 27);
  const separated = Array.from({length: 12}, (_, index) => ({...proposal(26), x: index * .06, width: .02}));
  assert.equal(patternCandidates(separated).length, 8);
});
