/**
 * One symbol, rendered as a chip. A continuation piece (leading "##") gets
 * a visually distinct, muted style and sits flush against the chip before
 * it — the same thing the "##" marker means, shown twice over: once as the
 * literal text the tokenizer actually emits, once as the shape.
 */

export function createPieceChip(symbol: string): HTMLElement {
  const isContinuation = symbol.startsWith('##');
  const chip = document.createElement('span');
  chip.className = 'piece-chip' + (isContinuation ? ' is-continuation' : ' is-initial');
  chip.textContent = symbol;
  return chip;
}

export function createPieceRow(symbols: string[]): HTMLElement {
  const row = document.createElement('span');
  row.className = 'piece-row';
  row.append(...symbols.map(createPieceChip));
  return row;
}

export function createUnkChip(): HTMLElement {
  const chip = document.createElement('span');
  chip.className = 'piece-chip is-unk';
  chip.textContent = '[UNK]';
  return chip;
}
