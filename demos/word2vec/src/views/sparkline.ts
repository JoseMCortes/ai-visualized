/** A tiny loss sparkline — the last N step losses as a polyline. */

const SVG = 'http://www.w3.org/2000/svg';
const W = 240;
const H = 44;
const KEEP = 120;

export interface Sparkline {
  push(value: number): void;
  clear(): void;
}

export function createSparkline(host: HTMLElement): Sparkline {
  host.classList.add('spark');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const path = document.createElementNS(SVG, 'polyline');
  path.setAttribute('class', 'spark-line');
  const label = document.createElementNS(SVG, 'text');
  label.setAttribute('class', 'spark-label');
  label.setAttribute('x', '2');
  label.setAttribute('y', '10');
  svg.append(path, label);
  host.replaceChildren(svg);

  let data: number[] = [];

  function draw(): void {
    if (data.length < 2) {
      path.setAttribute('points', '');
      label.textContent = 'loss';
      return;
    }
    const lo = Math.min(...data);
    const hi = Math.max(...data);
    const span = hi - lo || 1;
    const pts = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * W;
        const y = H - 4 - ((v - lo) / span) * (H - 12);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    path.setAttribute('points', pts);
    label.textContent = `loss ${data[data.length - 1]!.toFixed(2)}`;
  }

  return {
    push(value) {
      data.push(value);
      if (data.length > KEEP) data = data.slice(-KEEP);
      draw();
    },
    clear() {
      data = [];
      draw();
    },
  };
}
