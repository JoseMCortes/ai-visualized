/** The hybrid dial: one slider between pure lexical (BM25) and pure semantic (embeddings). */

export interface HybridControls {
  el: HTMLElement;
  setBreakdown(bm25Norm: number, cosineNorm: number, alpha: number, hybrid: number): void;
}

export function createHybridControls(onChange: (alpha: number) => void): HybridControls {
  const el = document.createElement('div');
  el.className = 'hybrid-controls';

  const row = document.createElement('div');
  row.className = 'hybrid-slider-row';
  const semLabel = document.createElement('span');
  semLabel.textContent = 'semantic';
  const lexLabel = document.createElement('span');
  lexLabel.textContent = 'lexical';
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = '1';
  input.step = '0.05';
  input.value = '0.5';
  const value = document.createElement('span');
  value.className = 'hybrid-alpha';
  value.textContent = 'α = 0.50';
  row.append(semLabel, input, lexLabel, value);

  const blend = document.createElement('div');
  blend.className = 'hybrid-blend';

  input.addEventListener('input', () => {
    const alpha = Number(input.value);
    value.textContent = `α = ${alpha.toFixed(2)}`;
    onChange(alpha);
  });

  el.append(row, blend);

  function setBreakdown(bm25Norm: number, cosineNorm: number, alpha: number, hybrid: number): void {
    blend.innerHTML = '';
    const lex = document.createElement('div');
    lex.className = 'hybrid-seg';
    lex.innerHTML = `<span class="hybrid-seg-fill is-lex" style="width:${(alpha * bm25Norm * 100).toFixed(0)}%"></span><span>lexical: α × ${bm25Norm.toFixed(2)} = ${(alpha * bm25Norm).toFixed(2)}</span>`;
    const sem = document.createElement('div');
    sem.className = 'hybrid-seg';
    sem.innerHTML = `<span class="hybrid-seg-fill is-sem" style="width:${((1 - alpha) * cosineNorm * 100).toFixed(0)}%"></span><span>semantic: (1−α) × ${cosineNorm.toFixed(2)} = ${((1 - alpha) * cosineNorm).toFixed(2)}</span>`;
    const total = document.createElement('div');
    total.className = 'hybrid-total';
    total.innerHTML = `blended score = <strong>${hybrid.toFixed(2)}</strong>`;
    blend.append(lex, sem, total);
  }

  return { el, setBreakdown };
}
