/**
 * Each token's attention weight across every training step so far — the
 * three lines can never cross the same way a ranking chart's can't, since
 * they always sum to 1, but watching how much each one gives up or gains
 * is the whole story of what training did. Palette: blue/orange/aqua, the
 * dataviz skill's first three categorical slots (validated all-pairs on
 * this repo's white panel surface). The aqua slot sits in the CVD/contrast
 * "legal only with secondary encoding" band, so this chart always carries
 * a legend and direct end-of-line labels — never color alone for identity.
 */

const SVG = 'http://www.w3.org/2000/svg';
const W = 400;
const H = 200;
const PAD_L = 30;
const PAD_R = 46;
const PAD_T = 10;
const PAD_B = 22;

const COLORS = ['#2a78d6', '#eb6834', '#1baf7a']; // blue, orange, aqua

export interface AttentionChart {
  render(tokens: string[], history: number[][]): void; // history[i] = weight series for tokens[i]
}

export function createAttentionChart(host: HTMLElement): AttentionChart {
  host.classList.add('attn-chart');
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const legend = document.createElement('div');
  legend.className = 'attn-chart-legend';
  host.append(svg, legend);

  function render(tokens: string[], history: number[][]): void {
    const steps = history[0]?.length ?? 0;
    const frag = document.createDocumentFragment();

    // gridlines at 0%, 25%, 50%, 75%, 100%
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const y = H - PAD_B - p * (H - PAD_T - PAD_B);
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', String(PAD_L));
      line.setAttribute('x2', String(W - PAD_R));
      line.setAttribute('y1', y.toFixed(1));
      line.setAttribute('y2', y.toFixed(1));
      line.setAttribute('class', 'attn-chart-grid');
      frag.appendChild(line);
      const lbl = document.createElementNS(SVG, 'text');
      lbl.setAttribute('x', String(PAD_L - 4));
      lbl.setAttribute('y', (y + 3).toFixed(1));
      lbl.setAttribute('text-anchor', 'end');
      lbl.setAttribute('class', 'attn-chart-axis');
      lbl.textContent = `${Math.round(p * 100)}%`;
      frag.appendChild(lbl);
    }

    if (steps < 2) {
      svg.replaceChildren(frag);
      legend.replaceChildren(...tokens.map((t, i) => legendItem(t, COLORS[i % COLORS.length]!)));
      return;
    }

    const x = (i: number) => PAD_L + (i / (steps - 1)) * (W - PAD_L - PAD_R);
    const y = (v: number) => H - PAD_B - v * (H - PAD_T - PAD_B);

    tokens.forEach((token, i) => {
      const series = history[i]!;
      const color = COLORS[i % COLORS.length]!;
      const d = series
        .map((v, s) => `${s === 0 ? 'M' : 'L'}${x(s).toFixed(1)} ${y(v).toFixed(1)}`)
        .join(' ');
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'attn-chart-line');
      path.style.stroke = color;
      frag.appendChild(path);

      const last = series[series.length - 1]!;
      const endLabel = document.createElementNS(SVG, 'text');
      endLabel.setAttribute('x', String(x(steps - 1) + 5));
      endLabel.setAttribute('y', String(y(last) + 3));
      endLabel.setAttribute('class', 'attn-chart-end-label');
      endLabel.style.fill = color;
      endLabel.textContent = token;
      frag.appendChild(endLabel);
    });

    svg.replaceChildren(frag);
    legend.replaceChildren(...tokens.map((t, i) => legendItem(t, COLORS[i % COLORS.length]!)));
  }

  function legendItem(token: string, color: string): HTMLElement {
    const item = document.createElement('span');
    item.className = 'attn-chart-legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'attn-chart-swatch';
    swatch.style.background = color;
    const text = document.createElement('span');
    text.textContent = token;
    item.append(swatch, text);
    return item;
  }

  return { render };
}
