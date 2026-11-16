import { TEXTURE_MAX_SIDE } from './checker-texture';
import type { TextureResult } from './checker-texture';

interface Patch {
  pixels: number[]; tone: number; variance: number; x: number; y: number; width: number; height: number;
}

/** Experimental local light/dark region graph; no fixed image axes or square grid. */
export function findColorRegionTexture(rgba: Uint8ClampedArray, width: number, height: number,
  allowedMask?: Uint8Array): TextureResult {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > TEXTURE_MAX_SIDE || height > TEXTURE_MAX_SIDE || rgba.length !== width * height * 4
    || (allowedMask && allowedMask.length !== width * height)) throw new Error('Invalid texture image');
  const count = width * height;
  const allowed = Uint8Array.from({ length: count }, (_, p) => rgba[p * 4 + 3] > 0 && (!allowedMask || allowedMask[p]) ? 1 : 0);
  const gray = Float32Array.from({ length: count }, (_, p) =>
    .2126 * rgba[p * 4] + .7152 * rgba[p * 4 + 1] + .0722 * rgba[p * 4 + 2]);
  // All smoothing and local tone references exclude pixels outside the proposal.
  const smooth = new Float32Array(count);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = y * width + x;
    if (!allowed[p]) continue;
    let total = 0, samples = 0;
    for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
      for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
        const q = yy * width + xx;
        if (allowed[q]) { total += gray[q]; samples++; }
      }
    }
    smooth[p] = total / samples;
  }
  const stride = width + 1;
  const sums = new Float64Array(stride * (height + 1)), weights = new Uint32Array(sums.length);
  for (let y = 0; y < height; y++) {
    let total = 0, samples = 0;
    for (let x = 0; x < width; x++) {
      const p = y * width + x, q = (y + 1) * stride + x + 1;
      total += smooth[p]; samples += allowed[p];
      sums[q] = sums[q - stride] + total; weights[q] = weights[q - stride] + samples;
    }
  }
  const mask = new Uint8Array(count);
  const globalMean = sums[height * stride + width] / Math.max(1, weights[height * stride + width]);
  // Multiple local reference sizes preserve small cells and larger deformed patches.
  for (const radius of [8, 16, 28, 44]) {
    const signs = new Int8Array(count);
    const strong = new Uint8Array(count);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!allowed[p]) continue;
      const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1);
      const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1);
      const a = bottom * stride + right, b = top * stride + right;
      const c = bottom * stride + left, d = top * stride + left;
      const samples = weights[a] - weights[b] - weights[c] + weights[d];
      const difference = smooth[p] - (sums[a] - sums[b] - sums[c] + sums[d]) / samples;
      // Keep flat same-tone bridges connected, but leave ambiguous boundaries
      // unassigned so diagonal checker cells do not fuse at their corners.
      const dx = Math.abs(smooth[y * width + Math.min(width - 1, x + 1)] - smooth[y * width + Math.max(0, x - 1)]);
      const dy = Math.abs(smooth[Math.min(height - 1, y + 1) * width + x] - smooth[Math.max(0, y - 1) * width + x]);
      signs[p] = difference > 9 ? 1 : difference < -9 ? -1
        : dx + dy < 10 ? (smooth[p] >= globalMean ? 1 : -1) : 0;
      strong[p] = Math.abs(difference) > 9 ? 1 : 0;
    }
    const visited = new Uint8Array(count), queue = new Int32Array(count);
    const patches: Patch[] = [];
    for (let first = 0; first < count; first++) {
      if (!signs[first] || visited[first]) continue;
      let head = 0, tail = 1, left = width, right = 0, top = height, bottom = 0;
      let sx = 0, sy = 0, tone = 0, squared = 0, evidence = 0;
      queue[0] = first; visited[first] = 1;
      while (head < tail) {
        const p = queue[head++], x = p % width, y = Math.floor(p / width);
        sx += x; sy += y; tone += gray[p]; squared += gray[p] * gray[p]; evidence += strong[p];
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
        // Four-connectivity prevents equal-tone cells joining through diagonal corners.
        for (const q of [x ? p - 1 : -1, x + 1 < width ? p + 1 : -1,
          y ? p - width : -1, y + 1 < height ? p + width : -1]) {
          if (q >= 0 && !visited[q] && signs[q] === signs[first]) { visited[q] = 1; queue[tail++] = q; }
        }
      }
      const w = right - left + 1, h = bottom - top + 1;
      if (tail < 9 || tail > count * .12 || evidence < tail * .2 || Math.min(w, h) < 3 || Math.max(w / h, h / w) > 6
        || tail / (w * h) < .25) continue;
      patches.push({ pixels: Array.from(queue.subarray(0, tail)), tone: tone / tail,
        variance: Math.max(0, squared / tail - (tone / tail) ** 2),
        x: sx / tail, y: sy / tail, width: w, height: h });
    }
    // Bound graph work on highly fragmented inputs such as noise or fine fabric weave.
    patches.sort((a, b) => b.pixels.length - a.pixels.length);
    patches.length = Math.min(patches.length, 1000);
    const neighbors = patches.map((a, i) => {
      const candidates: { index: number; distance: number; ux: number; uy: number }[] = [];
      for (let j = 0; j < patches.length; j++) {
        const b = patches[j];
        const contrast = Math.abs(a.tone - b.tone);
        if (i === j || signs[a.pixels[0]] === signs[b.pixels[0]] || contrast < 18
          || Math.sqrt(a.variance + b.variance) > contrast * .7) continue;
        const areaRatio = a.pixels.length / b.pixels.length;
        if (areaRatio < .25 || areaRatio > 4) continue;
        const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
        if (!distance) continue;
        const ux = dx / distance, uy = dy / distance;
        const spacing = (Math.hypot(ux * a.width, uy * a.height) + Math.hypot(ux * b.width, uy * b.height)) / 2;
        if (distance < spacing * .45 || distance > spacing * 1.8) continue;
        candidates.push({ index: j, distance, ux, uy });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      const selected: typeof candidates = [];
      for (const candidate of candidates) {
        if (!selected.some(other => other.ux * candidate.ux + other.uy * candidate.uy > .85)) selected.push(candidate);
        if (selected.length === 8) break;
      }
      return selected.map(candidate => candidate.index);
    });
    const graph = neighbors.map((list, i) => list.filter(j => neighbors[j].includes(i)));
    const supported = patches.map((a, i) => {
      // Require an opposite pair and a transverse neighbor, with local axes free to bend.
      const vectors = graph[i].map(j => {
        const dx = patches[j].x - a.x, dy = patches[j].y - a.y, length = Math.hypot(dx, dy);
        return { x: dx / length, y: dy / length };
      });
      return vectors.some((u, j) => vectors.some((v, k) => k !== j && u.x * v.x + u.y * v.y < -.55
        && vectors.some((w, l) => l !== j && l !== k && Math.abs(u.x * w.y - u.y * w.x) > .55)));
    });
    const seen = new Set<number>();
    for (let first = 0; first < patches.length; first++) {
      if (!supported[first] || seen.has(first)) continue;
      const group = [first]; seen.add(first);
      for (let k = 0; k < group.length; k++) for (const j of graph[group[k]]) {
        if (supported[j] && !seen.has(j)) { seen.add(j); group.push(j); }
      }
      // An isolated light patch surrounded by four dark patches is insufficient.
      if (group.length < 4) continue;
      const accepted = new Set(group);
      for (const i of group) for (const j of graph[i]) accepted.add(j);
      for (const i of accepted) for (const p of patches[i].pixels) mask[p] = 255;
    }
  }
  // Keep separate cell interiors; never fill bounding boxes across forbidden pixels.
  const regions: TextureResult['regions'] = [];
  const visited = new Uint8Array(count), queue = new Int32Array(count);
  let area = 0;
  for (let first = 0; first < count; first++) {
    if (!mask[first] || visited[first]) continue;
    let head = 0, tail = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = first; visited[first] = 1;
    while (head < tail) {
      const p = queue[head++], x = p % width, y = Math.floor(p / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const q of [x ? p - 1 : -1, x + 1 < width ? p + 1 : -1,
        y ? p - width : -1, y + 1 < height ? p + width : -1]) {
        if (q >= 0 && mask[q] && !visited[q]) { visited[q] = 1; queue[tail++] = q; }
      }
    }
    area += tail;
    regions.push({ x: left / width, y: top / height, width: (right - left + 1) / width,
      height: (bottom - top + 1) / height, pixels: tail });
  }
  regions.sort((a, b) => b.pixels - a.pixels);
  return { width, height, mask, regions, coverage: area / count };
}
