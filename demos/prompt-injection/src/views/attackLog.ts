/** A running log of attempts, so toggling defenses and re-sending shows what changed. */

import type { AttemptResult } from '../lib/engine';

export interface LogEntry {
  result: AttemptResult;
  mitigationCount: number;
}

export interface AttackLog {
  render(entries: LogEntry[]): void;
}

export function createAttackLog(host: HTMLElement): AttackLog {
  host.classList.add('attack-log');

  function render(entries: LogEntry[]): void {
    if (entries.length === 0) {
      host.innerHTML = '<p class="panel-note">Attempts you send will be listed here.</p>';
      return;
    }
    host.replaceChildren(
      ...entries
        .slice()
        .reverse()
        .map((e, i) => {
          const row = document.createElement('div');
          row.className = 'log-row';
          const n = document.createElement('span');
          n.className = 'log-n';
          n.textContent = `#${entries.length - i}`;
          const cat = document.createElement('span');
          cat.className = 'log-cat';
          cat.textContent = e.result.categoryLabel;
          const defenses = document.createElement('span');
          defenses.className = 'log-dim';
          defenses.textContent = `${e.mitigationCount} defense${e.mitigationCount === 1 ? '' : 's'} on`;
          const verdict = document.createElement('span');
          verdict.className = 'log-verdict ' + (e.result.blocked ? 'is-safe' : 'is-leak');
          verdict.textContent = e.result.blocked ? '✅ defended' : '❌ leaked';
          row.append(n, cat, defenses, verdict);
          return row;
        }),
    );
  }

  return { render };
}
