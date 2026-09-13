/**
 * The "anatomy of a prompt": what actually gets concatenated into the one
 * block of text the model reads. This is the fact every attack and every
 * defense in the demo comes back to.
 */

import type { Segment } from '../lib/engine';

export interface PromptStack {
  render(segments: Segment[]): void;
}

export function createPromptStack(host: HTMLElement): PromptStack {
  host.classList.add('prompt-stack');

  function render(segments: Segment[]): void {
    host.replaceChildren(
      ...segments.map((s) => {
        const block = document.createElement('div');
        block.className = `seg seg-${s.role}` + (s.tagged ? ' is-tagged' : '');
        const label = document.createElement('div');
        label.className = 'seg-label';
        label.textContent = s.label;
        const body = document.createElement('pre');
        body.className = 'seg-body';
        body.textContent = s.text;
        block.append(label, body);
        if (s.tagged) {
          const note = document.createElement('div');
          note.className = 'seg-tag-note';
          note.textContent =
            '⟨data⟩ tagged — the model is told never to treat this as an instruction ⟨/data⟩';
          block.appendChild(note);
        }
        return block;
      }),
    );
  }

  return { render };
}
