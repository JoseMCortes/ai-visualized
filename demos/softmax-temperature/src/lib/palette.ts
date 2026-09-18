/**
 * Fixed categorical order, validated for this repo's white panel surface
 * (#ffffff) via the dataviz skill's palette checker: worst-adjacent CVD
 * ΔE 9.1 (protan) / 5.8 (tritan) and three slots (aqua, yellow, magenta)
 * sit below 3:1 contrast on white — both bands are "legal only with
 * secondary encoding", so every chart that uses this palette also carries
 * a legend and direct end-of-line labels (never color alone for identity).
 *
 * Never cycle this order and never reassign a color by rank — an entry
 * keeps its slot for as long as it exists in the vector.
 */
export const CATEGORICAL_PALETTE = [
  '#2a78d6', // 1 blue
  '#eb6834', // 2 orange
  '#1baf7a', // 3 aqua
  '#eda100', // 4 yellow
  '#e87ba4', // 5 magenta
  '#008300', // 6 green
  '#4a3aa7', // 7 violet
  '#e34948', // 8 red
] as const;

export function colorFor(index: number): string {
  return CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length]!;
}
