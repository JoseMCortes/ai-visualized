/** The simulated conversation, plus a debugger-style breakdown of the verdict. */

import { STOPPED_BY } from '../lib/attacks';
import type { AttemptResult } from '../lib/engine';
import { MITIGATIONS } from '../lib/mitigations';

export interface ResponsePanel {
  render(userText: string, result: AttemptResult | null): void;
}

const MITIGATION_LABEL = new Map(MITIGATIONS.map((m) => [m.id, m.label]));

export function createResponsePanel(host: HTMLElement): ResponsePanel {
  host.classList.add('response-panel');

  function render(userText: string, result: AttemptResult | null): void {
    if (!result) {
      host.innerHTML = '<p class="panel-note">Press Send to try an attempt.</p>';
      return;
    }

    const chat = document.createElement('div');
    chat.className = 'chat';
    const userBubble = document.createElement('div');
    userBubble.className = 'bubble bubble-user';
    userBubble.textContent = userText;
    chat.appendChild(userBubble);

    if (result.draftBeforeFilter) {
      const draft = document.createElement('div');
      draft.className = 'bubble bubble-draft';
      draft.innerHTML = `<span class="draft-label">draft, before the output filter ran</span><s>${escapeHtml(result.draftBeforeFilter)}</s>`;
      chat.appendChild(draft);
    }

    const reply = document.createElement('div');
    reply.className = 'bubble ' + (result.blocked ? 'bubble-safe' : 'bubble-leak');
    reply.textContent = result.response;
    chat.appendChild(reply);

    const verdict = document.createElement('div');
    verdict.className = 'verdict ' + (result.blocked ? 'is-safe' : 'is-leak');
    verdict.innerHTML = result.blocked
      ? `✅ <strong>Defended</strong> — caught by <strong>${MITIGATION_LABEL.get(result.reason!)}</strong>`
      : `❌ <strong>Leaked</strong> — none of the enabled defenses catch this attack`;

    const detail = document.createElement('div');
    detail.className = 'verdict-detail';
    const bits: string[] = [`attack type: <strong>${result.categoryLabel}</strong>`];
    if (result.blocked && result.activeBlockers.length > 1) {
      const others = result.activeBlockers
        .filter((m) => m !== result.reason)
        .map((m) => MITIGATION_LABEL.get(m));
      bits.push(`also would have caught it: ${others.join(', ')}`);
    } else if (!result.blocked) {
      const wouldWork = STOPPED_BY[result.category].map((m) => MITIGATION_LABEL.get(m));
      bits.push(`try enabling any of: ${wouldWork.join(', ')}`);
    }
    detail.innerHTML = bits.join(' · ');

    host.replaceChildren(chat, verdict, detail);
    if (result.note) {
      const note = document.createElement('p');
      note.className = 'panel-note';
      note.textContent = result.note;
      host.appendChild(note);
    }
  }

  return { render };
}

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}
