/**
 * Sample softmax at many temperatures across a log-spaced range, so the
 * probability-vs-temperature chart can draw one continuous curve per entry
 * instead of only showing a single T at a time.
 */

import { softmaxWithTemperature } from './softmax';

export interface CurvePoint {
  t: number;
  prob: number;
}

export interface EntryCurve {
  index: number;
  points: CurvePoint[];
}

export function sampleTemperatures(tMin: number, tMax: number, steps: number): number[] {
  const logMin = Math.log(tMin);
  const logMax = Math.log(tMax);
  return Array.from({ length: steps }, (_, i) => {
    const frac = steps === 1 ? 0 : i / (steps - 1);
    return Math.exp(logMin + frac * (logMax - logMin));
  });
}

export function buildCurves(
  scores: number[],
  tMin: number,
  tMax: number,
  steps = 60,
): EntryCurve[] {
  const temperatures = sampleTemperatures(tMin, tMax, steps);
  const curves: EntryCurve[] = scores.map((_, i) => ({ index: i, points: [] }));
  for (const t of temperatures) {
    const { rows } = softmaxWithTemperature(scores, t);
    rows.forEach((r, i) => curves[i]!.points.push({ t, prob: r.prob }));
  }
  return curves;
}
