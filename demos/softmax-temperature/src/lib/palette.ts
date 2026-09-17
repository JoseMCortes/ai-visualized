/**
 * Fixed categorical order, validated for this repo's dark panel surface
 * (#14141b) via the dataviz skill's palette checker: worst-adjacent CVD
 * ΔE 8.4 (protan) / 8.7 (tritan) — in the "legal only with secondary
 * encoding" band, so every chart that uses this palette also carries a
 * legend and direct end-of-line labels (never color alone for identity).
 *
 * Never cycle this order and never reassign a color by rank — an entry
 * keeps its slot for as long as it exists in the vector.
 */
export const CATEGORICAL_PALETTE = [
  '#3987e5', // 1 blue
  '#d95926', // 2 orange
  '#199e70', // 3 aqua
  '#c98500', // 4 yellow
  '#d55181', // 5 magenta
  '#008300', // 6 green
  '#9085e9', // 7 violet
  '#e66767', // 8 red
] as const;

export function colorFor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]!;
}
