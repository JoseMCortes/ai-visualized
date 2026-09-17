/**
 * The "right statistical distribution" view: probability vs. temperature,
 * one line per vector entry, log x-axis (T's effect is dramatic near 0 and
 * flattens out at high T). A vertical marker tracks the current T from the
 * slider. Because this palette's worst-adjacent CVD separation sits in the
 * 6-8 band (legal only with secondary encoding — see lib/palette.ts), every
 * line also carries a legend swatch+label and a direct end-of-line label so
 * identity never rides on hue alone. Hovering shows the exact values at the
 * nearest sampled T.
 */

import type { EntryCurve } from '../lib/curve';
import { T_MAX, T_MIN } from './tSlider';
import { colorFor } from '../lib/palette';

const SVG = 'http://www.w3.org/2000/svg';
const W = 760;
const H = 340;
const PAD_L = 38;
const PAD_R = 92; // room for direct end-of-line labels
const PAD_T = 14;
const PAD_B = 34;

const logMin = Math.log(T_MIN);
const logMax = Math.log(T_MAX);

const sx = (t: number): number =>
  PAD_L + ((Math.log(t) - logMin) / (logMax - logMin)) * (W - PAD_L - PAD_R);
const sy = (p: number): number => H - PAD_B - p * (H - PAD_T - PAD_B);

const X_TICKS = [0.1, 0.5, 1, 2, 5, 10, 20].filter((t) => t >= T_MIN && t <= T_MAX);
const Y_TICKS = [0, 0.25, 0.5, 0.75, 1];

export interface ProbabilityCurveChart {
  el: HTMLElement;
  render(curves: EntryCurve[], labels: string[], currentT: number): void;
}

/**
 * When several entries converge to similar probabilities (very common at
 * high T, where everything trends toward 1/N), their end-of-line labels
 * would otherwise stack on top of each other and become illegible. Spread
 * any that are closer than `minGap` apart, keeping the whole cluster inside
 * [minY, maxY].
 */
function declutterY(ys: number[], minGap: number, minY: number, maxY: number): number[] {
  const order = ys.map((_, i) => i).sort((a, b) => ys[a]! - ys[b]!);
  const out = [...ys];
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1]!;
    const cur = order[k]!;
    if (out[cur]! - out[prev]! < minGap) out[cur] = out[prev]! + minGap;
  }
  const last = order[order.length - 1];
  if (last !== undefined && out[last]! > maxY) {
    const shift = out[last]! - maxY;
    for (const idx of order) out[idx]! -= shift;
  }
  const first = order[0];
  if (first !== undefined && out[first]! < minY) {
    const shift = minY - out[first]!;
    for (const idx of order) out[idx]! += shift;
  }
  return out;
}

export function createProbabilityCurveChart(host: HTMLElement): ProbabilityCurveChart {
  host.classList.add('curve-chart');

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('role', 'img');

  const tooltip = document.createElement('div');
  tooltip.className = 'curve-tooltip';
  tooltip.hidden = true;

  const legend = document.createElement('div');
  legend.className = 'curve-legend';

  host.append(svg, tooltip, legend);

  let lastCurves: EntryCurve[] = [];
  let lastLabels: string[] = [];

  function drawAxes(frag: DocumentFragment): void {
    for (const t of X_TICKS) {
      const x = sx(t);
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', x.toFixed(1));
      line.setAttribute('x2', x.toFixed(1));
      line.setAttribute('y1', String(PAD_T));
      line.setAttribute('y2', String(H - PAD_B));
      line.setAttribute('class', 'cc-gridline');
      frag.appendChild(line);

      const label = document.createElementNS(SVG, 'text');
      label.setAttribute('x', x.toFixed(1));
      label.setAttribute('y', String(H - PAD_B + 16));
      label.setAttribute('class', 'cc-axis-label');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = `${t}`;
      frag.appendChild(label);
    }

    for (const p of Y_TICKS) {
      const y = sy(p);
      const line = document.createElementNS(SVG, 'line');
      line.setAttribute('x1', String(PAD_L));
      line.setAttribute('x2', String(W - PAD_R));
      line.setAttribute('y1', y.toFixed(1));
      line.setAttribute('y2', y.toFixed(1));
      line.setAttribute('class', 'cc-gridline' + (p === 0 ? ' cc-baseline' : ''));
      frag.appendChild(line);

      const label = document.createElementNS(SVG, 'text');
      label.setAttribute('x', String(PAD_L - 6));
      label.setAttribute('y', (y + 3).toFixed(1));
      label.setAttribute('class', 'cc-axis-label');
      label.setAttribute('text-anchor', 'end');
      label.textContent = `${Math.round(p * 100)}%`;
      frag.appendChild(label);
    }

    const xAxisCaption = document.createElementNS(SVG, 'text');
    xAxisCaption.setAttribute('x', String((PAD_L + W - PAD_R) / 2));
    xAxisCaption.setAttribute('y', String(H - 4));
    xAxisCaption.setAttribute('class', 'cc-axis-caption');
    xAxisCaption.setAttribute('text-anchor', 'middle');
    xAxisCaption.textContent = 'temperature T (log scale)';
    frag.appendChild(xAxisCaption);
  }

  function render(curves: EntryCurve[], labels: string[], currentT: number): void {
    lastCurves = curves;
    lastLabels = labels;

    const frag = document.createDocumentFragment();
    drawAxes(frag);

    const rawEndY = curves.map((c) => sy(c.points[c.points.length - 1]!.prob));
    const endY = declutterY(rawEndY, 11, PAD_T + 8, H - PAD_B - 2);
    const endX = sx(curves[0]?.points[curves[0].points.length - 1]?.t ?? T_MAX) + 6;

    curves.forEach((curve, i) => {
      const color = colorFor(curve.index);
      const d = curve.points
        .map((pt, k) => `${k === 0 ? 'M' : 'L'}${sx(pt.t).toFixed(1)} ${sy(pt.prob).toFixed(1)}`)
        .join(' ');
      const path = document.createElementNS(SVG, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'cc-line');
      path.setAttribute('data-series', String(curve.index));
      path.style.stroke = color;
      frag.appendChild(path);

      // direct end-of-line label — the secondary encoding this palette's CVD band requires
      const trueY = rawEndY[i]!;
      const labelY = endY[i]!;
      if (Math.abs(labelY - trueY) > 1) {
        // the label was pushed off its line to avoid a collision — draw a short leader
        const leader = document.createElementNS(SVG, 'line');
        leader.setAttribute('x1', String(endX - 6));
        leader.setAttribute('y1', trueY.toFixed(1));
        leader.setAttribute('x2', String(endX - 2));
        leader.setAttribute('y2', labelY.toFixed(1));
        leader.setAttribute('class', 'cc-leader');
        leader.setAttribute('data-series', String(curve.index));
        leader.style.stroke = color;
        frag.appendChild(leader);
      }
      const endLabel = document.createElementNS(SVG, 'text');
      endLabel.setAttribute('x', String(endX));
      endLabel.setAttribute('y', String(labelY + 3));
      endLabel.setAttribute('class', 'cc-end-label');
      endLabel.setAttribute('data-series', String(curve.index));
      endLabel.style.fill = color;
      endLabel.textContent = labels[curve.index] ?? String(curve.index);
      frag.appendChild(endLabel);
    });

    // current-T marker
    const markerX = sx(Math.min(T_MAX, Math.max(T_MIN, currentT)));
    const marker = document.createElementNS(SVG, 'line');
    marker.setAttribute('x1', markerX.toFixed(1));
    marker.setAttribute('x2', markerX.toFixed(1));
    marker.setAttribute('y1', String(PAD_T));
    marker.setAttribute('y2', String(H - PAD_B));
    marker.setAttribute('class', 'cc-marker');
    frag.appendChild(marker);

    // transparent hover-catcher, drawn last so it sits on top
    const catcher = document.createElementNS(SVG, 'rect');
    catcher.setAttribute('x', String(PAD_L));
    catcher.setAttribute('y', String(PAD_T));
    catcher.setAttribute('width', String(W - PAD_L - PAD_R));
    catcher.setAttribute('height', String(H - PAD_T - PAD_B));
    catcher.setAttribute('fill', 'transparent');
    catcher.addEventListener('mousemove', (ev) => onHover(ev as MouseEvent));
    catcher.addEventListener('mouseleave', () => {
      tooltip.hidden = true;
    });
    frag.appendChild(catcher);

    svg.replaceChildren(frag);

    // legend (always present for >= 2 series, per the dataviz skill)
    legend.replaceChildren(
      ...curves.map((c) => {
        const item = document.createElement('span');
        item.className = 'cc-legend-item';
        item.dataset.series = String(c.index);
        const swatch = document.createElement('span');
        swatch.className = 'cc-legend-swatch';
        swatch.style.background = colorFor(c.index);
        const text = document.createElement('span');
        text.textContent = labels[c.index] ?? String(c.index);
        item.append(swatch, text);
        item.addEventListener('mouseenter', () => highlight(c.index));
        item.addEventListener('mouseleave', () => highlight(null));
        return item;
      }),
    );
  }

  function highlight(index: number | null): void {
    svg.querySelectorAll<SVGElement>('[data-series]').forEach((elx) => {
      const isMatch = elx.dataset.series === String(index);
      elx.style.opacity = index === null || isMatch ? '1' : '0.25';
    });
    legend.querySelectorAll<HTMLElement>('.cc-legend-item').forEach((elx) => {
      elx.classList.toggle('is-dim', index !== null && elx.dataset.series !== String(index));
    });
  }

  function onHover(ev: MouseEvent): void {
    if (lastCurves.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const px = ((ev.clientX - rect.left) / rect.width) * W;
    const frac = Math.min(1, Math.max(0, (px - PAD_L) / (W - PAD_L - PAD_R)));
    const t = Math.exp(logMin + frac * (logMax - logMin));

    const points = lastCurves[0]!.points;
    let nearest = 0;
    let best = Infinity;
    points.forEach((pt, i) => {
      const dist = Math.abs(Math.log(pt.t) - Math.log(t));
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });

    const sampledT = points[nearest]!.t;
    const rows = lastCurves
      .map((c) => ({ index: c.index, prob: c.points[nearest]!.prob }))
      .sort((a, b) => b.prob - a.prob);

    tooltip.innerHTML =
      `<div class="curve-tooltip-t">T = ${sampledT < 1 ? sampledT.toFixed(2) : sampledT.toFixed(1)}</div>` +
      rows
        .map(
          (r) =>
            `<div class="curve-tooltip-row"><span class="curve-tooltip-swatch" style="background:${colorFor(r.index)}"></span>${
              lastLabels[r.index] ?? r.index
            }: ${(r.prob * 100).toFixed(1)}%</div>`,
        )
        .join('');
    tooltip.hidden = false;
    tooltip.style.left = `${(sx(sampledT) / W) * 100}%`;
    tooltip.style.top = `8px`;
  }

  return { el: host, render };
}
