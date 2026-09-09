/** Make whitespace visible in the token displays. */

export function glyph(ch: string): string {
  if (ch === ' ') return '␣';
  if (ch === '\n') return '⏎';
  if (ch === '\t') return '⇥';
  return ch;
}

/** A short human label for a token position, e.g. `12 "e"`. */
export function tokenLabel(index: number, ch: string): string {
  return `${index} ${JSON.stringify(glyph(ch))}`;
}
