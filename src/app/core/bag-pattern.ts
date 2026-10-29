import { findCheckerTexture, TEXTURE_MAX_SIDE } from './checker-texture';
import type { Detection, ImageGeometry } from './vision';
import type { TextureResult } from './checker-texture';

export interface PatternCandidate { detection: Detection; texture: TextureResult; coverage: number; matched: boolean; }
export interface RecognitionResult { detections: Detection[]; candidates: PatternCandidate[]; }
export type RecognitionPhase = 'loading' | 'running' | 'texture';
export type RecognitionMode = 'pattern' | 'objects';

function overlap(a: Detection, b: Detection): number {
  const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))
    * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return intersection / (a.width * a.height + b.width * b.height - intersection);
}

export function patternCandidates(detections: readonly Detection[]): Detection[] {
  // The known side-view failure is "tie". Its mask is a proposal, never relabeled as a bag.
  const classes = [24, 26, 27, 28];
  const selected: Detection[] = [];
  for (const detection of [...detections].sort((a, b) => b.confidence - a.confidence)) {
    if (!classes.includes(detection.classId) || selected.some(existing => overlap(existing, detection) > .8)) continue;
    selected.push(detection);
    if (selected.length === 8) break;
  }
  return selected;
}

/** Verify repeated cells strictly within a model-predicted instance mask. */
export function checkBagPattern(rgba: Uint8ClampedArray, geometry: ImageGeometry, detection: Detection): PatternCandidate {
  if (rgba.length !== 640 * 640 * 4 || detection.mask.width !== 160 || detection.mask.height !== 160
    || detection.mask.data.length !== 160 * 160
    || ![geometry.width, geometry.height, geometry.padX, geometry.padY].every(Number.isInteger)
    || geometry.width < 1 || geometry.height < 1 || geometry.padX < 0 || geometry.padY < 0
    || geometry.width + geometry.padX > 640 || geometry.height + geometry.padY > 640) throw new Error('Invalid pattern proposal');
  const scale = Math.min(1, TEXTURE_MAX_SIDE / Math.max(geometry.width, geometry.height));
  const width = Math.max(1, Math.round(geometry.width * scale));
  const height = Math.max(1, Math.round(geometry.height * scale));
  const pixels = new Uint8ClampedArray(width * height * 4), allowed = new Uint8Array(width * height);
  let area = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = geometry.padX + Math.min(geometry.width - 1, Math.floor((x + .5) * geometry.width / width));
    const sy = geometry.padY + Math.min(geometry.height - 1, Math.floor((y + .5) * geometry.height / height));
    const pixel = y * width + x, source = (sy * 640 + sx) * 4;
    pixels.set(rgba.subarray(source, source + 4), pixel * 4);
    if (detection.mask.data[Math.floor(sy / 4) * 160 + Math.floor(sx / 4)]) { allowed[pixel] = 255; area++; }
  }
  const texture = findCheckerTexture(pixels, width, height, allowed);
  const textureArea = texture.regions.reduce((sum, region) => sum + region.pixels, 0);
  const coverage = area ? textureArea / area : 0;
  return { detection, texture, coverage, matched: textureArea >= 300 && coverage >= .02 };
}
