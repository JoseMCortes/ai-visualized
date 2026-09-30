/** Step / Play / Run-a-batch / Reset — the same transport controls as every other training demo here. */

export interface TrainingControlsHandlers {
  onStep(): void;
  onPlayToggle(): void;
  onRunBatch(): void;
  onReset(): void;
}

export interface TrainingControls {
  el: HTMLElement;
  setState(state: { playing: boolean; finished: boolean }): void;
}

const BATCH_SIZE = 20;

export function createTrainingControls(h: TrainingControlsHandlers): TrainingControls {
  const el = document.createElement('div');
  el.className = 'training-controls';

  const step = button('Step ▸', () => h.onStep());
  const play = button('Play ▶', () => h.onPlayToggle());
  play.classList.add('btn-primary');
  const run = button(`Run ${BATCH_SIZE} ▸▸`, () => h.onRunBatch());
  const reset = button('Reset ↻', () => h.onReset());
  el.append(step, play, run, reset);

  function setState({ playing, finished }: { playing: boolean; finished: boolean }): void {
    play.textContent = playing ? 'Pause ⏸' : 'Play ▶';
    step.disabled = playing || finished;
    run.disabled = playing || finished;
    play.disabled = finished;
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

export { BATCH_SIZE };
