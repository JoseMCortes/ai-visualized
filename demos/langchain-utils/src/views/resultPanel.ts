/** Shows the formatted prompt messages, the model's raw text, and the parsed structured result. */

import type { FormattedMessage } from '../lib/prompt';
import type { ReviewExtraction } from '../lib/schema';

export type ResultState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'error'; message: string }
  | {
      kind: 'done';
      rawResponse: string;
      parsed: ReviewExtraction | null;
      parseError: string | null;
    };

export interface ResultPanel {
  el: HTMLElement;
  renderPrompt(messages: FormattedMessage[]): void;
  renderResult(state: ResultState): void;
}

const SENTIMENT_CLASS: Record<string, string> = {
  positive: 'is-positive',
  negative: 'is-negative',
  neutral: 'is-neutral',
};

export function createResultPanel(): ResultPanel {
  const el = document.createElement('div');
  el.className = 'result-panel';

  const promptSection = document.createElement('div');
  promptSection.className = 'res-section';
  const promptTitle = document.createElement('div');
  promptTitle.className = 'res-section-title';
  promptTitle.textContent = 'Formatted prompt (stage 1 — free, no key needed)';
  const promptMessages = document.createElement('div');
  promptMessages.className = 'res-messages';
  promptSection.append(promptTitle, promptMessages);

  const resultSection = document.createElement('div');
  resultSection.className = 'res-section';
  const resultTitle = document.createElement('div');
  resultTitle.className = 'res-section-title';
  resultTitle.textContent = 'Model response + parsed result';
  const resultBody = document.createElement('div');
  resultBody.className = 'res-result-body';
  resultSection.append(resultTitle, resultBody);

  el.append(promptSection, resultSection);

  function renderPrompt(messages: FormattedMessage[]): void {
    promptMessages.replaceChildren(
      ...messages.map((m) => {
        const row = document.createElement('div');
        row.className = 'res-message';
        const role = document.createElement('span');
        role.className = 'res-role';
        role.textContent = m.role;
        const content = document.createElement('span');
        content.className = 'res-content';
        content.textContent = m.content;
        row.append(role, content);
        return row;
      }),
    );
  }

  function renderResult(state: ResultState): void {
    if (state.kind === 'idle') {
      resultBody.innerHTML = `<p class="res-placeholder">Enter your API key above and press Run to call the model for real.</p>`;
      return;
    }
    if (state.kind === 'running') {
      resultBody.innerHTML = `<p class="res-placeholder">Calling the model…</p>`;
      return;
    }
    if (state.kind === 'error') {
      resultBody.innerHTML = '';
      const err = document.createElement('p');
      err.className = 'res-error';
      err.textContent = state.message;
      resultBody.appendChild(err);
      return;
    }

    resultBody.innerHTML = '';

    const raw = document.createElement('div');
    raw.className = 'res-raw';
    const rawLabel = document.createElement('div');
    rawLabel.className = 'res-raw-label';
    rawLabel.textContent = 'raw text back from the model';
    const rawText = document.createElement('pre');
    rawText.className = 'res-raw-text';
    rawText.textContent = state.rawResponse;
    raw.append(rawLabel, rawText);
    resultBody.appendChild(raw);

    if (state.parsed) {
      const card = document.createElement('div');
      card.className = 'res-card';
      const badge = document.createElement('span');
      badge.className = `res-badge ${SENTIMENT_CLASS[state.parsed.sentiment] ?? ''}`;
      badge.textContent = state.parsed.sentiment;
      const summary = document.createElement('p');
      summary.className = 'res-summary';
      summary.textContent = state.parsed.summary;
      const topics = document.createElement('div');
      topics.className = 'res-topics';
      topics.append(
        ...state.parsed.topics.map((t) => {
          const pill = document.createElement('span');
          pill.className = 'res-topic';
          pill.textContent = t;
          return pill;
        }),
      );
      card.append(badge, summary, topics);
      resultBody.appendChild(card);
    } else if (state.parseError) {
      const err = document.createElement('p');
      err.className = 'res-error';
      err.textContent = `Could not parse the model's response into the schema: ${state.parseError}`;
      resultBody.appendChild(err);
    }
  }

  return { el, renderPrompt, renderResult };
}
