/** Preset picker + an editable list of (label, score) rows — capped at 7 entries. */

import { colorFor } from '../lib/palette';
import type { Preset } from '../lib/presets';

export interface VectorEditorHandlers {
  onPreset(preset: Preset): void;
  onScoreChange(index: number, value: number): void;
}

export interface VectorEditor {
  el: HTMLElement;
  render(
    activePresetId: string | null,
    description: string,
    labels: string[],
    scores: number[],
  ): void;
}

export function createVectorEditor(presets: Preset[], h: VectorEditorHandlers): VectorEditor {
  const el = document.createElement('div');
  el.className = 'vector-editor';

  const pills = document.createElement('div');
  pills.className = 've-pills';
  const pillEls = presets.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 've-pill';
    b.textContent = p.label;
    b.addEventListener('click', () => h.onPreset(p));
    pills.appendChild(b);
    return b;
  });

  const desc = document.createElement('p');
  desc.className = 've-desc';

  const rows = document.createElement('div');
  rows.className = 've-rows';

  el.append(pills, desc, rows);

  let rowInputs: HTMLInputElement[] = [];

  function render(
    activePresetId: string | null,
    description: string,
    labels: string[],
    scores: number[],
  ): void {
    presets.forEach((p, i) => pillEls[i]!.classList.toggle('is-active', p.id === activePresetId));
    desc.textContent = description;

    if (rowInputs.length !== labels.length) {
      rows.replaceChildren();
      rowInputs = labels.map((label, i) => {
        const row = document.createElement('label');
        row.className = 've-row';

        const swatch = document.createElement('span');
        swatch.className = 've-swatch';
        swatch.style.background = colorFor(i);

        const lbl = document.createElement('span');
        lbl.className = 've-label';
        lbl.textContent = label;

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 've-input';
        input.step = '0.1';
        input.addEventListener('input', () => {
          const v = Number(input.value);
          if (Number.isFinite(v)) h.onScoreChange(i, v);
        });

        row.append(swatch, lbl, input);
        rows.appendChild(row);
        return input;
      });
    } else {
      // labels may have changed identity (e.g. same count, different preset) — relabel in place
      rows.querySelectorAll<HTMLElement>('.ve-label').forEach((elLbl, i) => {
        elLbl.textContent = labels[i]!;
      });
    }

    rowInputs.forEach((input, i) => {
      const v = scores[i]!;
      // avoid clobbering the caret while the user is mid-edit with the same value
      if (input.value === '' || Number(input.value) !== v) input.value = v.toFixed(2);
    });
  }

  return { el, render };
}
