/** Tiny k-means on 2-D points — used only to colour the map by cluster. */

import { mulberry32 } from './trainer';

export function kmeans(points: [number, number][], k: number, seed = 1): number[] {
  if (points.length <= k) return points.map((_, i) => i % k);
  const rng = mulberry32(seed);
  // k random distinct seeds
  const idx = [...points.keys()];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  let centers = idx.slice(0, k).map((i) => [...points[i]!] as [number, number]);
  const assign = new Array<number>(points.length).fill(0);

  for (let iter = 0; iter < 30; iter++) {
    let changed = false;
    for (let p = 0; p < points.length; p++) {
      let best = 0;
      let bestD = Infinity;
      for (let c = 0; c < k; c++) {
        const dx = points[p]![0] - centers[c]![0];
        const dy = points[p]![1] - centers[c]![1];
        const d = dx * dx + dy * dy;
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      if (assign[p] !== best) {
        assign[p] = best;
        changed = true;
      }
    }
    const sum = centers.map(() => [0, 0, 0]); // x, y, count
    for (let p = 0; p < points.length; p++) {
      const s = sum[assign[p]!]!;
      s[0] += points[p]![0];
      s[1] += points[p]![1];
      s[2] += 1;
    }
    centers = sum.map(
      (s, c) => (s[2] ? [s[0] / s[2], s[1] / s[2]] : centers[c]!) as [number, number],
    );
    if (!changed) break;
  }
  return assign;
}
