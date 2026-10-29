export const TEXTURE_MAX_SIDE = 512;
export interface TextureRegion { x: number; y: number; width: number; height: number; pixels: number; }
export interface TextureResult { width: number; height: number; mask: Uint8Array; regions: TextureRegion[]; coverage: number; }

function integral(values: ArrayLike<number>, width: number, height: number): Float64Array {
  const result = new Float64Array((width + 1) * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += values[y * width + x];
      result[(y + 1) * (width + 1) + x + 1] = result[y * (width + 1) + x + 1] + row;
    }
  }
  return result;
}

function sum(table: Float64Array, stride: number, x: number, y: number, w: number, h: number): number {
  return table[(y + h) * stride + x + w] - table[y * stride + x + w]
    - table[(y + h) * stride + x] + table[y * stride + x];
}

/** Find repeated alternating light/dark cells. This is a texture heuristic, not an object classifier. */
export function findCheckerTexture(rgba: Uint8ClampedArray, width: number, height: number, allowedMask?: Uint8Array): TextureResult {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1
    || width > TEXTURE_MAX_SIDE || height > TEXTURE_MAX_SIDE || rgba.length !== width * height * 4
    || (allowedMask && allowedMask.length !== width * height)) {
    throw new Error('Invalid texture image');
  }
  const count = width * height;
  const empty = (): TextureResult => ({ width, height, mask: new Uint8Array(count), regions: [], coverage: 0 });
  if (width < 24 || height < 24) return empty();
  const gray = new Float32Array(count);
  for (let i = 0; i < count; i++) gray[i] = (.2126 * rgba[i * 4] + .7152 * rgba[i * 4 + 1] + .0722 * rgba[i * 4 + 2]) * rgba[i * 4 + 3] / 255;
  // Suppress fabric weave and JPEG noise while keeping the larger alternating cells.
  const original = integral(gray, width, height);
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) gray[y * width + x] = sum(original, width + 1, x - 1, y - 1, 3, 3) / 9;
  const votes = new Uint8Array(count);
  const scales = [4, 6, 9, 13, 18, 25, 35];
  const ratios = [.35, .5, .75, 1, 1.5, 2, 3];
  for (const angle of [-30, -15, 0, 15, 30, 45]) {
    const radians = angle * Math.PI / 180;
    const cosine = Math.cos(radians), sine = Math.sin(radians);
    const rw = Math.ceil(Math.abs(width * cosine) + Math.abs(height * sine));
    const rh = Math.ceil(Math.abs(width * sine) + Math.abs(height * cosine));
    const rotated = new Float32Array(rw * rh);
    const valid = new Uint8Array(rw * rh);
    for (let y = 0; y < rh; y++) for (let x = 0; x < rw; x++) {
      const dx = x - (rw - 1) / 2, dy = y - (rh - 1) / 2;
      const sx = dx * cosine + dy * sine + (width - 1) / 2;
      const sy = -dx * sine + dy * cosine + (height - 1) / 2;
      if (sx < 0 || sy < 0 || sx >= width - 1 || sy >= height - 1) continue;
      const ix = Math.floor(sx), iy = Math.floor(sy), fx = sx - ix, fy = sy - iy;
      const p = iy * width + ix;
      rotated[y * rw + x] = (gray[p] * (1 - fx) + gray[p + 1] * fx) * (1 - fy)
        + (gray[p + width] * (1 - fx) + gray[p + width + 1] * fx) * fy;
      valid[y * rw + x] = !allowedMask || (allowedMask[p] && allowedMask[p + 1]
        && allowedMask[p + width] && allowedMask[p + width + 1]) ? 1 : 0;
    }
    const table = integral(rotated, rw, rh), validity = integral(valid, rw, rh);
    const gx = new Float32Array(rw * rh), gy = new Float32Array(rw * rh), gxy = new Float32Array(rw * rh);
    for (let y = 1; y < rh - 1; y++) for (let x = 1; x < rw - 1; x++) {
      const pixel = y * rw + x;
      const dx = rotated[pixel + 1] - rotated[pixel - 1], dy = rotated[pixel + rw] - rotated[pixel - rw];
      gx[pixel] = dx * dx; gy[pixel] = dy * dy; gxy[pixel] = dx * dy;
    }
    const energyX = integral(gx, rw, rh), energyY = integral(gy, rw, rh), cross = integral(gxy, rw, rh);
    const stride = rw + 1;
    const additions = new Int32Array((rw + 1) * (rh + 1));
    for (const scale of scales) for (const ratio of ratios) {
      const cw = Math.max(3, Math.round(scale * Math.sqrt(ratio)));
      const ch = Math.max(3, Math.round(scale / Math.sqrt(ratio)));
      if (4 * cw > rw || 4 * ch > rh) continue;
      const cellArea = cw * ch;
      const step = Math.max(2, Math.floor(Math.min(cw, ch) / 3));
      for (let y = 2 * ch; y <= rh - 2 * ch; y += step) for (let x = 2 * cw; x <= rw - 2 * cw; x += step) {
        const a = sum(table, stride, x - cw, y - ch, cw, ch) / cellArea;
        const b = sum(table, stride, x, y - ch, cw, ch) / cellArea;
        const c = sum(table, stride, x - cw, y, cw, ch) / cellArea;
        const d = sum(table, stride, x, y, cw, ch) / cellArea;
        const signedSaddle = (a - b - c + d) / 4;
        const saddle = Math.abs(signedSaddle);
        if (saddle < 7.5 || Math.abs(a - d) + Math.abs(b - c) > saddle * 2.2) continue;
        if (sum(validity, stride, x - 2 * cw, y - 2 * ch, 4 * cw, 4 * ch) < 16 * cellArea) continue;
        let total = 0, squared = 0, alternating = 0;
        const rows = [0, 0, 0, 0], columns = [0, 0, 0, 0];
        for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
          const value = sum(table, stride, x + (col - 2) * cw, y + (row - 2) * ch, cw, ch) / cellArea;
          const signed = value * ((row + col) % 2 ? -1 : 1);
          total += value; squared += value * value; alternating += signed;
          rows[row] += signed; columns[col] += signed;
        }
        const amplitude = Math.abs(alternating) / 16;
        const variance = squared / 16 - (total / 16) ** 2;
        const direction = alternating > 0 ? 1 : -1;
        const regular = amplitude >= 9 && variance > 0 && amplitude / Math.sqrt(variance) >= .72
          && rows.filter(value => value * direction > 4 * amplitude * .35).length >= 3
          && columns.filter(value => value * direction > 4 * amplitude * .35).length >= 3;
        if (!regular) {
          // Folds and perspective change cell spacing. Look for alternating corners
          // in both directions with some spacing tolerance instead of forcing a rigid grid.
          const oppositeCorner = (cx: number, cy: number): boolean => {
            if (cx < cw || cy < ch || cx + cw > rw || cy + ch > rh) return false;
            const q1 = sum(table, stride, cx - cw, cy - ch, cw, ch) / cellArea;
            const q2 = sum(table, stride, cx, cy - ch, cw, ch) / cellArea;
            const q3 = sum(table, stride, cx - cw, cy, cw, ch) / cellArea;
            const q4 = sum(table, stride, cx, cy, cw, ch) / cellArea;
            const response = (q1 - q2 - q3 + q4) / 4;
            return response * signedSaddle < 0 && Math.abs(response) >= Math.max(5, saddle * .5)
              && Math.abs(q1 - q4) + Math.abs(q2 - q3) < Math.abs(response) * 2;
          };
          let horizontal = 0, vertical = 0;
          for (const sign of [-1, 1]) {
            let hx = false, vy = false;
            for (const factor of [.75, 1, 1.25]) {
              if (!hx) hx = oppositeCorner(x + Math.round(cw * factor) * sign, y);
              if (!vy) vy = oppositeCorner(x, y + Math.round(ch * factor) * sign);
            }
            horizontal += Number(hx); vertical += Number(vy);
          }
          if (!horizontal || !vertical || horizontal + vertical < 3
            || amplitude < 5 || variance <= 0 || amplitude / Math.sqrt(variance) < .45) continue;
        }
        // Parallel stripes can alias into a sampled checker grid. Require gradient
        // energy in two independent directions, not just alternating cell means.
        const xx = sum(energyX, stride, x - 2 * cw, y - 2 * ch, 4 * cw, 4 * ch);
        const yy = sum(energyY, stride, x - 2 * cw, y - 2 * ch, 4 * cw, 4 * ch);
        const xy = sum(cross, stride, x - 2 * cw, y - 2 * ch, 4 * cw, 4 * ch);
        if (xx + yy <= 0 || (xx * yy - xy * xy) / (xx + yy) ** 2 < .04) continue;
        // Paint the central cells only: surrounding cells supply repeat evidence.
        const left = x - cw, top = y - ch, right = x + cw, bottom = y + ch;
        additions[top * stride + left]++; additions[top * stride + right]--;
        additions[bottom * stride + left]--; additions[bottom * stride + right]++;
      }
    }
    for (let y = 0; y < rh; y++) {
      let row = 0;
      for (let x = 0; x < rw; x++) {
        row += additions[y * stride + x];
        additions[y * stride + x] = row + (y ? additions[(y - 1) * stride + x] : 0);
      }
    }
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const dx = x - (width - 1) / 2, dy = y - (height - 1) / 2;
      const rx = Math.round(dx * cosine - dy * sine + (rw - 1) / 2);
      const ry = Math.round(dx * sine + dy * cosine + (rh - 1) / 2);
      if (rx >= 0 && ry >= 0 && rx < rw && ry < rh && additions[ry * stride + rx] >= 2) votes[y * width + x]++;
    }
  }
  const mask = new Uint8Array(count);
  for (let i = 0; i < count; i++) mask[i] = votes[i] && (!allowedMask || allowedMask[i]) ? 255 : 0;
  // Drop isolated weak patches; retain the texture itself rather than filling its bounding box.
  const visited = new Uint8Array(count), queue = new Int32Array(count);
  const regions: TextureRegion[] = [];
  const minimumArea = Math.max(100, Math.round(count * .002));
  for (let first = 0; first < count; first++) {
    if (!mask[first] || visited[first]) continue;
    let head = 0, tail = 1, left = width, right = 0, top = height, bottom = 0;
    queue[0] = first; visited[first] = 1;
    while (head < tail) {
      const pixel = queue[head++], x = pixel % width, y = Math.floor(pixel / width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      for (const next of [x ? pixel - 1 : -1, x < width - 1 ? pixel + 1 : -1, y ? pixel - width : -1, y < height - 1 ? pixel + width : -1]) {
        if (next >= 0 && mask[next] && !visited[next]) { visited[next] = 1; queue[tail++] = next; }
      }
    }
    if (tail < minimumArea) { for (let i = 0; i < tail; i++) mask[queue[i]] = 0; }
    else regions.push({ x: left / width, y: top / height, width: (right - left + 1) / width, height: (bottom - top + 1) / height, pixels: tail });
  }
  regions.sort((a, b) => b.pixels - a.pixels);
  return { width, height, mask, regions, coverage: regions.reduce((sum, region) => sum + region.pixels, 0) / count };
}
