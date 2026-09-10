/** Step / play / run / reset buttons and the four sliders. */

export interface ControlHandlers {
  onStep(): void;
  onPlayToggle(): void;
  onRunBatch(): void;
  onReset(): void;
  onSpeed(v: number): void;
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

export function createControls(
  init: { speed: number; learningRate: number; windowSize: number; negatives: number },
  h: ControlHandlers,
): Controls {
  const el = document.createElement('div');
  el.className = 'controls';

  const buttons = document.createElement('div');
  buttons.className = 'controls-buttons';
  const step = button('Step ▸', () => h.onStep());
  const play = button('Play ▶', () => h.onPlayToggle());
  play.classList.add('btn-primary');
  const run = button('Run 500', () => h.onRunBatch());
  const reset = button('Reset ↻', () => h.onReset());
  buttons.append(step, play, run, reset);

  const sliders = document.createElement('div');
  sliders.className = 'controls-sliders';
  sliders.append(
    slider('Speed', 4, 120, 2, init.speed, (v) => `${v}/s`, h.onSpeed),
    slider(
      'Learning rate',
      0.01,
      0.2,
      0.01,
      init.learningRate,
      (v) => v.toFixed(2),
      h.onLearningRate,
    ),
    slider('Window', 1, 3, 1, init.windowSize, (v) => String(v), h.onWindow),
    slider('Negatives', 1, 6, 1, init.negatives, (v) => String(v), h.onNegatives),
  );

  el.append(buttons, sliders);

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

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
