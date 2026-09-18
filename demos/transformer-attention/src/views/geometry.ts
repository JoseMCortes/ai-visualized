/** Small geometry / colour helpers shared by the two views. */

/** Quadratic Bézier from (x1, baseY) up over to (x2, baseY). Longer hops lift higher. */
export function arcPath(x1: number, x2: number, baseY: number, maxLift: number): string {
  const span = Math.abs(x2 - x1);
  const lift = Math.min(maxLift, 18 + span * 0.4);
  const cx = (x1 + x2) / 2;
  return `M ${x1.toFixed(1)} ${baseY} Q ${cx.toFixed(1)} ${(baseY - lift).toFixed(1)} ${x2.toFixed(1)} ${baseY}`;
}

/** Perceptual-ish emphasis for small weights: gamma < 1 lifts the low end. */
export function emphasize(weight: number, gamma = 0.65): number {
  return Math.pow(Math.max(0, Math.min(1, weight)), gamma);
}

/** Accent colour at a given opacity — the one hue both views use. */
export function accent(alpha: number): string {
  return `rgba(79, 70, 229, ${alpha.toFixed(3)})`;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}
