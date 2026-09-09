/** Generate / stop / reset buttons and the sampling sliders. */

export interface GenHandlers {
  onGenerate(): void;
  onStop(): void;
  onReset(): void;
  onTemperature(value: number): void;
  onTopK(value: number): void;
  onTopP(value: number): void;
}

export interface GenState {
  generating: boolean;
  temperature: number;
  topK: number;
  topP: number;
  atLimit: boolean;
}

export interface GenControls {
  el: HTMLElement;
  update(state: GenState): void;
}

function slider(
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  format: (v: number) => string,
  onInput: (v: number) => void,
): { el: HTMLElement; set(v: number): void } {
  const el = document.createElement('label');
  el.className = 'slider';
  const name = document.createElement('span');
  name.className = 'slider-name';
  name.textContent = label;
  const out = document.createElement('span');
  out.className = 'slider-value';
  out.textContent = format(value);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(value);
  input.addEventListener('input', () => {
    const v = Number(input.value);
    out.textContent = format(v);
    onInput(v);
  });
  el.append(name, input, out);
  return {
    el,
    set(v) {
      input.value = String(v);
      out.textContent = format(v);
    },
  };
}

export function createGenControls(init: GenState, handlers: GenHandlers): GenControls {
  const el = document.createElement('div');
  el.className = 'gen';

  const buttons = document.createElement('div');
  buttons.className = 'gen-buttons';
  const generate = document.createElement('button');
  generate.type = 'button';
  generate.className = 'btn btn-primary';
  generate.textContent = 'Generate ▶';
  generate.addEventListener('click', () => handlers.onGenerate());
  const stop = document.createElement('button');
  stop.type = 'button';
  stop.className = 'btn';
  stop.textContent = 'Stop ■';
  stop.addEventListener('click', () => handlers.onStop());
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn';
  reset.textContent = 'Reset ↺';
  reset.addEventListener('click', () => handlers.onReset());
  buttons.append(generate, stop, reset);

  const sliders = document.createElement('div');
  sliders.className = 'gen-sliders';
  const temp = slider(
    'Temperature',
    0,
    1.5,
    0.05,
    init.temperature,
    (v) => (v === 0 ? 'greedy' : v.toFixed(2)),
    handlers.onTemperature,
  );
  const topK = slider(
    'Top-k',
    0,
    65,
    1,
    init.topK,
    (v) => (v === 0 ? 'off' : String(v)),
    handlers.onTopK,
  );
  const topP = slider(
    'Top-p',
    0.1,
    1,
    0.05,
    init.topP,
    (v) => (v >= 1 ? 'off' : v.toFixed(2)),
    handlers.onTopP,
  );
  sliders.append(temp.el, topK.el, topP.el);

  const note = document.createElement('p');
  note.className = 'gen-note';

  el.append(buttons, sliders, note);

  function update(state: GenState): void {
    generate.disabled = state.generating || state.atLimit;
    stop.disabled = !state.generating;
    reset.disabled = state.generating;
    temp.set(state.temperature);
    topK.set(state.topK);
    topP.set(state.topP);
    note.textContent = state.atLimit
      ? 'Reached the 128-character context window — reset to generate again.'
      : state.generating
        ? 'Generating…'
        : '';
  }

  update(init);
  return { el, update };
}
