/** Preset review picker + an editable textarea. */

import type { ExampleReview } from '../lib/schema';

export interface ReviewPickerHandlers {
  onPreset(review: ExampleReview): void;
  onTextChange(text: string): void;
}

export interface ReviewPicker {
  el: HTMLElement;
  render(activePresetId: string | null, text: string): void;
}

export function createReviewPicker(
  examples: ExampleReview[],
  h: ReviewPickerHandlers,
): ReviewPicker {
  const el = document.createElement('div');
  el.className = 'review-picker';

  const pills = document.createElement('div');
  pills.className = 'rp-pills';
  const pillEls = examples.map((r) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rp-pill';
    b.textContent = r.label;
    b.addEventListener('click', () => h.onPreset(r));
    pills.appendChild(b);
    return b;
  });

  const textarea = document.createElement('textarea');
  textarea.className = 'rp-textarea';
  textarea.rows = 4;
  textarea.spellcheck = false;
  textarea.addEventListener('input', () => h.onTextChange(textarea.value));

  el.append(pills, textarea);

  function render(activePresetId: string | null, text: string): void {
    examples.forEach((r, i) => pillEls[i]!.classList.toggle('is-active', r.id === activePresetId));
    if (textarea.value !== text) textarea.value = text;
  }

  return { el, render };
}
