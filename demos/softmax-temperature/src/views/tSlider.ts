/**
 * The temperature control: a log-scale slider (T's effect is dramatic near 0
 * and flattens out at high values, so a linear slider would waste most of
 * its range), a numeric readout, a Step button that jumps through curated
 * checkpoints, and a Play button that continuously sweeps T low<->high so
 * the distribution's shape is watched changing in real time.
 */

export const T_MIN = 0.05;
export const T_MAX = 20;

/** Curated checkpoints the Step button cycles through — roughly log-spaced, always including T=1. */
export const T_CHECKPOINTS = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10, 20];

const logMin = Math.log(T_MIN);
const logMax = Math.log(T_MAX);
const SLIDER_MAX = 1000;

function tToSlider(t: number): number {
  const clamped = Math.min(T_MAX, Math.max(T_MIN, t));
  return Math.round(((Math.log(clamped) - logMin) / (logMax - logMin)) * SLIDER_MAX);
}

function sliderToT(s: number): number {
  const frac = s / SLIDER_MAX;
  return Math.exp(logMin + frac * (logMax - logMin));
}

export interface TSliderHandlers {
  onChange(t: number): void;
  onStep(): void;
  onPlayToggle(): void;
  onReset(): void;
}

export interface TSlider {
  el: HTMLElement;
  setValue(t: number): void;
  setPlaying(playing: boolean): void;
}

export function createTSlider(initial: number, h: TSliderHandlers): TSlider {
  const el = document.createElement('div');
  el.className = 't-slider';

  const readout = document.createElement('div');
  readout.className = 't-readout';
  const tLabel = document.createElement('span');
  tLabel.className = 't-value';
  const tHint = document.createElement('span');
  tHint.className = 't-hint';
  readout.append(tLabel, tHint);

  const input = document.createElement('input');
  input.type = 'range';
  input.className = 't-range';
  input.min = '0';
  input.max = String(SLIDER_MAX);
  input.step = '1';

  const ticks = document.createElement('div');
  ticks.className = 't-ticks';
  for (const t of [0.1, 1, 10]) {
    const tick = document.createElement('span');
    tick.style.left = `${(tToSlider(t) / SLIDER_MAX) * 100}%`;
    tick.textContent = `T=${t}`;
    ticks.appendChild(tick);
  }

  const buttons = document.createElement('div');
  buttons.className = 't-buttons';
  const stepBtn = button('Step ▸', () => h.onStep());
  const playBtn = button('Play ▶', () => h.onPlayToggle());
  playBtn.classList.add('btn-primary');
  const resetBtn = button('Reset ↻ (T=1)', () => h.onReset());
  buttons.append(stepBtn, playBtn, resetBtn);

  input.addEventListener('input', () => h.onChange(sliderToT(Number(input.value))));

  el.append(readout, input, ticks, buttons);

  function hintFor(t: number): string {
    if (t < 0.2) return 'sharp — nearly one-hot on the top score';
    if (t < 0.8) return 'sharpened — the leader dominates';
    if (t <= 1.2) return 'standard softmax';
    if (t < 5) return 'softened — scores matter less';
    return 'flat — close to uniform';
  }

  function setValue(t: number): void {
    input.value = String(tToSlider(t));
    tLabel.textContent = `T = ${t < 1 ? t.toFixed(2) : t.toFixed(t < 10 ? 1 : 0)}`;
    tHint.textContent = hintFor(t);
  }

  setValue(initial);

  return {
    el,
    setValue,
    setPlaying(playing) {
      playBtn.textContent = playing ? 'Pause ⏸' : 'Play ▶';
      stepBtn.disabled = playing;
      resetBtn.disabled = playing;
      input.disabled = playing;
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
