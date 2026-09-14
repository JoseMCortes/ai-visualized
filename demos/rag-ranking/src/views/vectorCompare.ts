/**
 * The embeddings + cosine breakdown: the query's vector and the document's
 * vector, dimension by dimension, with a Play control that multiplies one
 * pair of numbers at a time and accumulates the dot product — so "cosine
 * similarity" stops being a black box and becomes eight small multiplications
 * added together, then rescaled by each vector's length.
 */

export interface VectorCompare {
  el: HTMLElement;
  setVectors(query: number[], doc: number[], cosine: number): void;
}

function bar(value: number, maxAbs: number): HTMLElement {
  const wrap = document.createElement('span');
  wrap.className = 'vc-bar';
  const fill = document.createElement('span');
  fill.className = value < 0 ? 'is-negative' : '';
  const pct = (Math.abs(value) / (maxAbs || 1)) * 50;
  fill.style.width = `${pct}%`;
  fill.style.marginLeft = value < 0 ? `${50 - pct}%` : '50%';
  wrap.appendChild(fill);
  return wrap;
}

export function createVectorCompare(): VectorCompare {
  const el = document.createElement('div');
  el.className = 'vector-compare';

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
  rowsHost.className = 'vc-rows';
  const totalEl = document.createElement('div');
  totalEl.className = 'term-total';

  el.append(controls, rowsHost, totalEl);

  let query: number[] = [];
  let doc: number[] = [];
  let cosine = 0;
  let revealed = 0;
  let timer = 0;

  function paint(): void {
    const maxAbs = Math.max(...query.map(Math.abs), ...doc.map(Math.abs), 1e-9);
    rowsHost.replaceChildren(
      ...query.map((q, i) => {
        const shown = i < revealed;
        const row = document.createElement('div');
        row.className = 'vc-row' + (shown ? ' is-shown' : '');
        const dim = document.createElement('span');
        dim.className = 'vc-dim';
        dim.textContent = `d${i + 1}`;
        const qBar = bar(q, maxAbs);
        const dBar = bar(doc[i]!, maxAbs);
        const product = document.createElement('span');
        product.className = 'vc-product';
        product.textContent = shown ? `${(q * doc[i]!).toFixed(2)}` : '';
        row.append(dim, qBar, dBar, product);
        return row;
      }),
    );
    const dot = query.slice(0, revealed).reduce((s, q, i) => s + q * doc[i]!, 0);
    totalEl.innerHTML =
      revealed >= query.length
        ? `dot product = ${dot.toFixed(2)} → rescaled by vector length → <strong>cosine similarity = ${cosine.toFixed(2)}</strong>`
        : `running dot product: ${dot.toFixed(2)} (${revealed}/${query.length} dimensions added)`;
    playBtn.disabled = revealed >= query.length;
    stepBtn.disabled = revealed >= query.length;
  }

  function step(): void {
    if (revealed < query.length) {
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
    timer = window.setInterval(step, 450);
  });

  function setVectors(q: number[], d: number[], cos: number): void {
    window.clearInterval(timer);
    timer = 0;
    query = q;
    doc = d;
    cosine = cos;
    revealed = 0;
    paint();
  }

  return { el, setVectors };
}
