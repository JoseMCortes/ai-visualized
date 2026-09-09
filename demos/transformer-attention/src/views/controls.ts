/** Text box + layer / head selector buttons. */

import type { HeadSelection } from './attentionData';

export interface ControlHandlers {
  onText(value: string): void;
  onLayer(layer: number): void;
  onHead(head: HeadSelection): void;
}

export interface Controls {
  el: HTMLElement;
  update(state: { nLayer: number; nHead: number; layer: number; head: HeadSelection }): void;
}

export function createControls(text: string, handlers: ControlHandlers): Controls {
  const el = document.createElement('div');
  el.className = 'controls';

  const field = document.createElement('label');
  field.className = 'field';
  field.innerHTML = '<span>Text</span>';
  const input = document.createElement('input');
  input.type = 'text';
  input.value = text;
  input.spellcheck = false;
  input.autocomplete = 'off';
  input.addEventListener('input', () => handlers.onText(input.value));
  field.appendChild(input);

  const layerRow = document.createElement('div');
  layerRow.className = 'segrow';
  layerRow.innerHTML = '<span>Layer</span>';
  const layerGroup = document.createElement('div');
  layerGroup.className = 'seg';
  layerRow.appendChild(layerGroup);

  const headRow = document.createElement('div');
  headRow.className = 'segrow';
  headRow.innerHTML = '<span>Head</span>';
  const headGroup = document.createElement('div');
  headGroup.className = 'seg';
  headRow.appendChild(headGroup);

  el.append(field, layerRow, headRow);

  function button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  let built = -1;

  function update(state: {
    nLayer: number;
    nHead: number;
    layer: number;
    head: HeadSelection;
  }): void {
    if (built !== state.nLayer * 100 + state.nHead) {
      layerGroup.replaceChildren(
        ...Array.from({ length: state.nLayer }, (_, i) =>
          button(String(i + 1), () => handlers.onLayer(i)),
        ),
      );
      headGroup.replaceChildren(
        ...Array.from({ length: state.nHead }, (_, i) =>
          button(String(i + 1), () => handlers.onHead(i)),
        ),
        button('mean', () => handlers.onHead('mean')),
      );
      built = state.nLayer * 100 + state.nHead;
    }
    [...layerGroup.children].forEach((b, i) => b.classList.toggle('is-on', i === state.layer));
    [...headGroup.children].forEach((b, i) => {
      const isMean = i === state.nHead;
      b.classList.toggle('is-on', isMean ? state.head === 'mean' : state.head === i);
    });
  }

  return { el, update };
}
