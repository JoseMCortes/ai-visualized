/** The five defenses, off by default, each with a one-sentence explanation. */

import { MITIGATIONS, type MitigationId } from '../lib/mitigations';

export interface MitigationToggles {
  el: HTMLElement;
  /** mark which mitigations are credited with stopping the most recent attempt */
  highlight(active: ReadonlySet<MitigationId>): void;
}

export function createMitigationToggles(
  onChange: (ids: Set<MitigationId>) => void,
): MitigationToggles {
  const el = document.createElement('div');
  el.className = 'mitigations';
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = 'Defenses (off by default — turn them on and try again)';
  el.appendChild(label);

  const enabled = new Set<MitigationId>();
  const rows = new Map<MitigationId, HTMLElement>();

  for (const m of MITIGATIONS) {
    const row = document.createElement('label');
    row.className = 'toggle-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () => {
      if (box.checked) enabled.add(m.id);
      else enabled.delete(m.id);
      onChange(new Set(enabled));
    });
    const text = document.createElement('span');
    text.innerHTML = `<strong>${m.label}.</strong> ${m.description}`;
    row.append(box, text);
    el.appendChild(row);
    rows.set(m.id, row);
  }

  function highlight(active: ReadonlySet<MitigationId>): void {
    for (const [id, row] of rows) row.classList.toggle('is-credited', active.has(id));
  }

  return { el, highlight };
}
