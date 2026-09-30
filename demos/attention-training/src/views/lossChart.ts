/**
 * Loss over training steps, log-scaled — this loss collapses by several
 * orders of magnitude within the first few steps, so a linear scale would
 * flatten out and hide exactly the part worth watching.
 */

const SVG = 'http://www.w3.org/2000/svg';
const W = 320;
const H = 70;
const PAD = 6;
const FLOOR = 1e-6; // avoid log(0)

export interface LossChart {
  render(losses: number[]): void;
}

export function createLossChart(host: HTMLElement): LossChart {
  host.classList.add('loss-chart');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const path = document.createElementNS(SVG, 'polyline');
  path.setAttribute('class', 'loss-line');
  const label = document.createElementNS(SVG, 'text');
  label.setAttribute('class', 'loss-label');
  label.setAttribute('x', '4');
  label.setAttribute('y', '14');
  svg.append(path, label);
  host.appendChild(svg);

  function render(losses: number[]): void {
    if (losses.length === 0) {
      path.setAttribute('points', '');
      label.textContent = 'loss';
      return;
    }
    const logs = losses.map((l) => Math.log10(Math.max(l, FLOOR)));
    const lo = Math.min(...logs);
    const hi = Math.max(...logs);
    const span = hi - lo || 1;
    const points = logs
      .map((v, i) => {
        const x = losses.length === 1 ? W / 2 : (i / (losses.length - 1)) * (W - 2 * PAD) + PAD;
        const y = H - PAD - ((v - lo) / span) * (H - 2 * PAD);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    path.setAttribute('points', points);
    label.textContent = `loss ${losses[losses.length - 1]!.toFixed(4)} (log scale)`;
  }

  return { render };
}
