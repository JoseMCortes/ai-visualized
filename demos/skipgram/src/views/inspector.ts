/**
 * The step inspector — every number that went into the current nudge, laid out
 * like a debugger's "locals" view.
 */

import type { StepTrace, WordScore } from '../lib/skipgram';

export interface Inspector {
  render(trace: StepTrace | null): void;
}

const n = (x: number, d = 3): string => (x >= 0 ? '+' : '') + x.toFixed(d);

export function createInspector(host: HTMLElement): Inspector {
  host.classList.add('inspector');

  function scoreRow(s: WordScore, tag: string): string {
    return `
      <div class="ins-row ${s.target === 1 ? 'is-pos' : 'is-neg'}">
        <span class="ins-tag">${tag}</span>
        <span class="ins-word">${s.word}</span>
        <span>C·w ${n(s.score, 2)}</span>
        <span>→ p ${s.prob.toFixed(2)}</span>
        <span class="ins-dim">want ${s.target}</span>
        <span>err ${n(s.error, 2)}</span>
      </div>`;
  }

  function render(trace: StepTrace | null): void {
    if (!trace) {
      host.innerHTML = '<p class="panel-note">Press Step to run one nudge.</p>';
      return;
    }

    const moveRows = trace.moves
      .map((m) => {
        const len = Math.hypot(m.delta[0], m.delta[1]);
        return `<div class="ins-row">
          <span class="ins-word">${m.word}</span>
          <span class="ins-dim">move</span>
          <span>(${n(m.delta[0])}, ${n(m.delta[1])})</span>
          <span class="ins-dim">|${len.toFixed(3)}|</span>
        </div>`;
      })
      .join('');

    host.innerHTML = `
      <div class="ins-head">
        step ${trace.step} · epoch ${trace.epoch} · lr ${trace.learningRate} ·
        loss <strong>${trace.loss.toFixed(3)}</strong>
      </div>
      <div class="ins-block">
        <div class="ins-label">1 · pick a pair from the text</div>
        <div class="ins-row">
          <span class="ins-word is-center">${trace.center.word}</span>
          <span class="ins-dim">is the center; its real neighbour is</span>
          <span class="ins-word is-pos">${trace.positive.word}</span>
        </div>
      </div>
      <div class="ins-block">
        <div class="ins-label">2 · score each pair: p = sigmoid(C · w), compare to the target</div>
        ${scoreRow(trace.positive, 'pos')}
        ${trace.negatives.map((s) => scoreRow(s, 'neg')).join('')}
      </div>
      <div class="ins-block">
        <div class="ins-label">3 · nudge every involved vector by −lr · err · (the other vector)</div>
        ${moveRows}
      </div>`;
  }

  return { render };
}
