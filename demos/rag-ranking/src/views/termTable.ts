/**
 * The term-by-term arithmetic for TF-IDF and BM25: one row per query word,
 * each showing the numbers that go into it and what it contributes, revealed
 * one row at a time (Step/Play) so the running total visibly builds up
 * instead of appearing all at once.
 */

export interface TermPart {
  label: string;
  value: string;
}

export interface TermRowView {
  term: string;
  inDoc: boolean;
  parts: TermPart[];
  contribution: number;
}

export interface TermTable {
  el: HTMLElement;
  /** Load a new set of rows (e.g. a different focused document) and collapse back to step 0. */
  setRows(rows: TermRowView[], formula: string): void;
}

export function createTermTable(): TermTable {
  const el = document.createElement('div');
  el.className = 'term-table';

  const formulaEl = document.createElement('div');
  formulaEl.className = 'term-formula';
  const controls = document.createElement('div');
  controls.className = 'term-controls';
  const stepBtn = document.createElement('button');
  stepBtn.type = 'button';
  stepBtn.className = 'btn';
  stepBtn.textContent = 'Step ▸';
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'btn btn-primary';
  playBtn.textContent = 'Play ▶';
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'btn';
  resetBtn.textContent = 'Reset ↻';
  controls.append(stepBtn, playBtn, resetBtn);

  const rowsHost = document.createElement('div');
  rowsHost.className = 'term-rows';
  const totalEl = document.createElement('div');
  totalEl.className = 'term-total';

  el.append(formulaEl, controls, rowsHost, totalEl);

  let rows: TermRowView[] = [];
  let revealed = 0;
  let timer = 0;

  function paint(): void {
    rowsHost.replaceChildren(
      ...rows.map((r, i) => {
        const shown = i < revealed;
        const row = document.createElement('div');
        row.className = 'term-row' + (shown ? ' is-shown' : '') + (r.inDoc ? '' : ' is-absent');
        const term = document.createElement('span');
        term.className = 'term-word';
        term.textContent = r.term;
        const parts = document.createElement('span');
        parts.className = 'term-parts';
        parts.textContent = r.parts.map((p) => `${p.label} ${p.value}`).join('  ×  ');
        const eq = document.createElement('span');
        eq.className = 'term-eq';
        eq.textContent = shown ? `= ${r.contribution.toFixed(2)}` : '';
        row.append(term, parts, eq);
        return row;
      }),
    );
    const total = rows.slice(0, revealed).reduce((s, r) => s + r.contribution, 0);
    const full = rows.reduce((s, r) => s + r.contribution, 0);
    totalEl.innerHTML =
      revealed >= rows.length
        ? `total score = <strong>${full.toFixed(2)}</strong>`
        : `running total: ${total.toFixed(2)} (${revealed}/${rows.length} words added)`;
    playBtn.disabled = revealed >= rows.length;
    stepBtn.disabled = revealed >= rows.length;
  }

  function step(): void {
    if (revealed < rows.length) {
      revealed++;
      paint();
    } else {
      window.clearInterval(timer);
      timer = 0;
    }
  }

  stepBtn.addEventListener('click', step);
  resetBtn.addEventListener('click', () => {
    window.clearInterval(timer);
    timer = 0;
    revealed = 0;
    paint();
  });
  playBtn.addEventListener('click', () => {
    window.clearInterval(timer);
    timer = window.setInterval(step, 550);
  });

  function setRows(newRows: TermRowView[], formula: string): void {
    window.clearInterval(timer);
    timer = 0;
    rows = newRows;
    revealed = 0;
    formulaEl.textContent = formula;
    paint();
  }

  return { el, setRows };
}
