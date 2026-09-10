/** Text-source picker, train buttons, and the sampling sliders. */

export interface ControlHandlers {
  onSource(id: string): void;
  onPasteTrain(text: string): void;
  onVocabSize(n: number): void;
  onStep(): void;
  onPlayToggle(): void;
  onRunBatch(): void;
  onReset(): void;
  onLearningRate(v: number): void;
  onWindow(v: number): void;
  onNegatives(v: number): void;
}

export interface Controls {
  el: HTMLElement;
  setPlaying(playing: boolean): void;
}

function slider(
  name: string,
  min: number,
  max: number,
  step: number,
  value: number,
  fmt: (v: number) => string,
  onInput: (v: number) => void,
): HTMLElement {
  const el = document.createElement('label');
  el.className = 'slider';
  const s = document.createElement('span');
  s.className = 'slider-name';
  s.textContent = name;
  const out = document.createElement('span');
  out.className = 'slider-value';
  out.textContent = fmt(value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = fmt(v);
    onInput(v);
  });
  el.append(s, input, out);
  return el;
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

export function createControls(
  sources: { id: string; label: string }[],
  init: {
    source: string;
    vocabSize: number;
    learningRate: number;
    windowSize: number;
    negatives: number;
  },
  h: ControlHandlers,
): Controls {
  const el = document.createElement('div');
  el.className = 'controls';

  // row 1: source + vocab size
  const row1 = document.createElement('div');
  row1.className = 'controls-row';
  const seg = document.createElement('div');
  seg.className = 'seg';
  const srcButtons = new Map<string, HTMLButtonElement>();
  for (const s of [...sources, { id: 'paste', label: 'Paste…' }]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = s.label;
    b.className = s.id === init.source ? 'is-on' : '';
    b.addEventListener('click', () => {
      srcButtons.forEach((x) => x.classList.remove('is-on'));
      b.classList.add('is-on');
      if (s.id === 'paste') paste.hidden = false;
      else {
        paste.hidden = true;
        h.onSource(s.id);
      }
    });
    srcButtons.set(s.id, b);
    seg.appendChild(b);
  }
  const label1 = document.createElement('span');
  label1.className = 'slider-name';
  label1.textContent = 'Text';
  row1.append(
    label1,
    seg,
    slider('Words', 40, 120, 5, init.vocabSize, (v) => String(v), h.onVocabSize),
  );

  // paste box (hidden until "Paste…")
  const paste = document.createElement('div');
  paste.className = 'paste';
  paste.hidden = true;
  const ta = document.createElement('textarea');
  ta.rows = 4;
  ta.placeholder = 'Paste a few paragraphs (more is better)…';
  const trainBtn = button('Train on this text', () => {
    if (ta.value.trim().length > 200) h.onPasteTrain(ta.value);
  });
  trainBtn.classList.add('btn-primary');
  paste.append(ta, trainBtn);

  // row 2: transport
  const row2 = document.createElement('div');
  row2.className = 'controls-row';
  const step = button('Step ▸', () => h.onStep());
  const play = button('Play ▶', () => h.onPlayToggle());
  play.classList.add('btn-primary');
  const run = button('Run 10k', () => h.onRunBatch());
  const reset = button('Reset ↻', () => h.onReset());
  row2.append(step, play, run, reset);

  // row 3: sliders
  const row3 = document.createElement('div');
  row3.className = 'controls-row';
  row3.append(
    slider(
      'Learning rate',
      0.01,
      0.15,
      0.01,
      init.learningRate,
      (v) => v.toFixed(2),
      h.onLearningRate,
    ),
    slider('Window', 2, 6, 1, init.windowSize, (v) => String(v), h.onWindow),
    slider('Negatives', 2, 8, 1, init.negatives, (v) => String(v), h.onNegatives),
  );

  el.append(row1, paste, row2, row3);

  return {
    el,
    setPlaying(playing) {
      play.textContent = playing ? 'Pause ⏸' : 'Play ▶';
      step.disabled = playing;
      run.disabled = playing;
      reset.disabled = playing;
    },
  };
}
