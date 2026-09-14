/** Step / Play / Run / Reset — shared by the cross-encoder and learning-to-rank training panels. */

export interface TrainingControls {
  el: HTMLElement;
  setPlaying(playing: boolean): void;
}

export interface TrainingHandlers {
  onStep(): void;
  onPlayToggle(): void;
  onRunBatch(): void;
  onReset(): void;
}

export function createTrainingControls(runLabel: string, h: TrainingHandlers): TrainingControls {
  const el = document.createElement('div');
  el.className = 'training-controls';

  function button(text: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  const step = button('Step ▸', () => h.onStep());
  const play = button('Play ▶', () => h.onPlayToggle());
  play.classList.add('btn-primary');
  const run = button(runLabel, () => h.onRunBatch());
  const reset = button('Reset ↻', () => h.onReset());
  el.append(step, play, run, reset);

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
