/**
 * Wires state (current vector + current T) to every view. Two update paths:
 * changing T re-renders the formula table / entropy meter / marker only
 * (cheap — one softmax call); changing the vector also rebuilds the
 * probability-vs-T curves (60 softmax calls across the T range).
 */

import { buildCurves } from './lib/curve';
import { colorFor } from './lib/palette';
import { PRESETS, type Preset } from './lib/presets';
import { softmaxWithTemperature } from './lib/softmax';
import { createEntropyMeter } from './views/entropyMeter';
import { createFormulaTable } from './views/formulaTable';
import { createProbabilityCurveChart } from './views/probabilityCurveChart';
import { createTSlider, T_CHECKPOINTS, T_MAX, T_MIN } from './views/tSlider';
import { createVectorEditor } from './views/vectorEditor';

const PLAY_PERIOD_MS = 9000; // one full low->high->low sweep

export function mountApp(root: HTMLElement): void {
  const editorHost = document.createElement('div');
  const sliderHost = document.createElement('div');
  const grid = document.createElement('div');
  grid.className = 'stage-grid';
  const tableHost = document.createElement('div');
  const entropyHost = document.createElement('div');
  const chartWrap = document.createElement('div');
  const chartTitle = document.createElement('h2');
  chartTitle.className = 'chart-title';
  chartTitle.textContent = 'Probability vs. temperature, for every entry';
  const chartSub = document.createElement('p');
  chartSub.className = 'chart-sub';
  chartSub.textContent =
    'Each line is one vector entry, tracked across every T from 0.05 to 20. The dashed marker is the T you have selected above.';
  const chartHost = document.createElement('div');
  chartWrap.append(chartTitle, chartSub, chartHost);

  grid.append(tableHost, entropyHost);
  root.replaceChildren(editorHost, sliderHost, grid, chartWrap);

  const formulaTable = createFormulaTable();
  tableHost.appendChild(formulaTable.el);

  const entropyMeter = createEntropyMeter();
  entropyHost.appendChild(entropyMeter.el);

  const curveChart = createProbabilityCurveChart(chartHost);

  let preset: Preset = PRESETS[0]!;
  let labels: string[] = [...preset.labels];
  let scores: number[] = [...preset.scores];
  let activePresetId: string | null = preset.id;
  let temperature = 1;
  let playing = false;
  let playRaf = 0;
  let playStart = 0;

  const vectorEditor = createVectorEditor(PRESETS, {
    onPreset: (p) => {
      preset = p;
      labels = [...p.labels];
      scores = [...p.scores];
      activePresetId = p.id;
      rebuildCurves();
      renderVector();
      renderAtCurrentT();
    },
    onScoreChange: (i, v) => {
      scores[i] = v;
      activePresetId = null; // hand-edited — no longer matches a preset exactly
      rebuildCurves();
      renderAtCurrentT();
    },
  });
  editorHost.appendChild(vectorEditor.el);

  const tSlider = createTSlider(temperature, {
    onChange: (t) => {
      temperature = t;
      renderAtCurrentT();
    },
    onStep: () => {
      // move to the next curated checkpoint strictly above the current T, wrapping around
      const next = T_CHECKPOINTS.find((t) => t > temperature + 1e-9) ?? T_CHECKPOINTS[0]!;
      temperature = next;
      tSlider.setValue(temperature);
      renderAtCurrentT();
    },
    onPlayToggle: togglePlay,
    onReset: () => {
      if (playing) togglePlay();
      temperature = 1;
      tSlider.setValue(temperature);
      renderAtCurrentT();
    },
  });
  sliderHost.appendChild(tSlider.el);

  let curves = buildCurves(scores, T_MIN, T_MAX);

  function rebuildCurves(): void {
    curves = buildCurves(scores, T_MIN, T_MAX);
  }

  function renderVector(): void {
    vectorEditor.render(activePresetId, preset.description, labels, scores);
  }

  function renderAtCurrentT(): void {
    const result = softmaxWithTemperature(scores, temperature);
    formulaTable.render(result, labels);
    entropyMeter.render(result.entropy, result.maxEntropy);
    curveChart.render(curves, labels, temperature);
  }

  function togglePlay(): void {
    playing = !playing;
    tSlider.setPlaying(playing);
    if (playing) {
      playStart = performance.now();
      const tick = (now: number) => {
        if (!playing) return;
        const elapsed = (now - playStart) % PLAY_PERIOD_MS;
        // ping-pong a triangle wave 0->1->0 across the period, mapped log-space over [T_MIN, T_MAX]
        const frac = elapsed / PLAY_PERIOD_MS;
        const tri = frac < 0.5 ? frac * 2 : 2 - frac * 2;
        const logMin = Math.log(T_MIN);
        const logMax = Math.log(T_MAX);
        temperature = Math.exp(logMin + tri * (logMax - logMin));
        tSlider.setValue(temperature);
        renderAtCurrentT();
        playRaf = requestAnimationFrame(tick);
      };
      playRaf = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(playRaf);
    }
  }

  // expose the palette to CSS custom properties for anything that wants to color by index (e.g. legend hover)
  scores.forEach((_, i) => root.style.setProperty(`--series-${i}`, colorFor(i)));

  renderVector();
  renderAtCurrentT();
}
