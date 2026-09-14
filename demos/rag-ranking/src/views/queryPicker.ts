/** The four example queries, each with a one-line "lesson" caption. */

import type { QueryDef } from '../corpus';

export interface QueryPicker {
  el: HTMLElement;
  setActive(id: string): void;
}

export function createQueryPicker(
  queries: QueryDef[],
  onSelect: (id: string) => void,
): QueryPicker {
  const el = document.createElement('div');
  el.className = 'query-picker';
  const label = document.createElement('div');
  label.className = 'field-label';
  label.textContent = 'Query';
  const row = document.createElement('div');
  row.className = 'query-row';
  const lesson = document.createElement('p');
  lesson.className = 'query-lesson';

  const buttons = new Map<string, HTMLButtonElement>();
  for (const q of queries) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn query-btn';
    b.innerHTML = `“${q.text}”`;
    b.addEventListener('click', () => {
      lesson.textContent = q.lesson;
      onSelect(q.id);
    });
    buttons.set(q.id, b);
    row.appendChild(b);
  }

  el.append(label, row, lesson);

  function setActive(id: string): void {
    for (const [qid, b] of buttons) b.classList.toggle('is-on', qid === id);
    const q = queries.find((x) => x.id === id);
    if (q) lesson.textContent = q.lesson;
  }

  return { el, setActive };
}
