/**
 * A gauge from "winner-take-all" (entropy 0, one-hot) to "uniform" (entropy
 * ln N, every option equally likely) — the scalar summary of how peaked or
 * flat the current distribution is, so the shape change has a number too.
 */

export interface EntropyMeter {
  el: HTMLElement;
  render(entropy: number, maxEntropy: number): void;
}

export function createEntropyMeter(): EntropyMeter {
  const el = document.createElement('div');
  el.className = 'entropy-meter';

  const labelRow = document.createElement('div');
  labelRow.className = 'em-label-row';
  const title = document.createElement('span');
  title.className = 'em-title';
  title.textContent = 'Entropy';
  const value = document.createElement('span');
  value.className = 'em-value';
  labelRow.append(title, value);

  const track = document.createElement('div');
  track.className = 'em-track';
  const fill = document.createElement('div');
  fill.className = 'em-fill';
  const marker = document.createElement('div');
  marker.className = 'em-marker';
  track.append(fill, marker);

  const ends = document.createElement('div');
  ends.className = 'em-ends';
  const lo = document.createElement('span');
  lo.textContent = 'winner-take-all (0)';
  const hi = document.createElement('span');
  hi.textContent = 'uniform (ln N)';
  ends.append(lo, hi);

  el.append(labelRow, track, ends);

  function render(entropy: number, maxEntropy: number): void {
    const frac = maxEntropy > 0 ? Math.min(1, Math.max(0, entropy / maxEntropy)) : 0;
    fill.style.width = `${frac * 100}%`;
    marker.style.left = `${frac * 100}%`;
    value.textContent = `${entropy.toFixed(2)} nats (of ${maxEntropy.toFixed(2)} max)`;
  }

  return { el, render };
}
