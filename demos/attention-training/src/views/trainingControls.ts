/** Step / Play / Run-a-batch / Reset — the same transport controls as every other training demo here. */

export interface TrainingControlsHandlers {
  onStep(): void;
  onPlayToggle(): void;
  onRunBatch(): void;
  onReset(): void;
}

export interface TrainingControls {
  el: HTMLElement;
  setState(state: { playing: boolean }): void;
}

export const BATCH_SIZE = 10;

export function createTrainingControls(h: TrainingControlsHandlers): TrainingControls {
  const el = document.createElement('div');
  el.className = 'training-controls';

  const step = button('Step ▸', () => h.onStep());
  const play = button('Play ▶', () => h.onPlayToggle());
  play.classList.add('btn-primary');
  const run = button(`Run ${BATCH_SIZE} ▸▸`, () => h.onRunBatch());
  const reset = button('Reset ↻', () => h.onReset());
  el.append(step, play, run, reset);

  function setState({ playing }: { playing: boolean }): void {
    play.textContent = playing ? 'Pause ⏸' : 'Play ▶';
    step.disabled = playing;
    run.disabled = playing;
    reset.disabled = playing;
  }

  return { el, setState };
}

function button(text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn';
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}
