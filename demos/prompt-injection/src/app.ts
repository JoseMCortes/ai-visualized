/**
 * Wires the composer, the defenses, and the two output panels to the engine.
 * There is no network call anywhere in here — `attempt()` is a pure function.
 */

import { attempt, type AttemptResult } from './lib/engine';
import type { MitigationId } from './lib/mitigations';
import { createAttackLog, type LogEntry } from './views/attackLog';
import { createComposer } from './views/composer';
import { createMitigationToggles } from './views/mitigationToggles';
import { createPromptStack } from './views/promptStack';
import { createResponsePanel } from './views/responsePanel';

export function mountApp(root: HTMLElement): void {
  const composerHost = document.createElement('div');
  const mitigationsHost = document.createElement('div');
  const stage = document.createElement('div');
  stage.className = 'stage';
  const stackHost = document.createElement('div');
  const responseHost = document.createElement('div');
  stage.append(stackHost, responseHost);
  const logHost = document.createElement('div');

  root.append(composerHost, mitigationsHost, stage, logHost);

  const stack = createPromptStack(stackHost);
  const response = createResponsePanel(responseHost);
  const log = createAttackLog(logHost);

  let mitigations = new Set<MitigationId>();
  let includeUntrusted = false;
  let lastUserText = '';
  const entries: LogEntry[] = [];

  const toggles = createMitigationToggles((ids) => {
    mitigations = ids;
  });
  mitigationsHost.appendChild(toggles.el);

  const composer = createComposer({
    onToggleUntrusted: (include) => {
      includeUntrusted = include;
      showPreview();
    },
    onSend: (userText) => {
      lastUserText = userText;
      const result = attempt({ userText, includeUntrusted, mitigations });
      entries.push({ result, mitigationCount: mitigations.size });
      stack.render(result.segments);
      response.render(userText, result);
      toggles.highlight(new Set(result.blocked ? [result.reason!] : []));
      log.render(entries);
    },
  });
  composerHost.appendChild(composer.el);

  function showPreview(): void {
    const preview = attempt({
      userText: lastUserText || '',
      includeUntrusted,
      mitigations: new Set(),
    });
    stack.render(preview.segments);
  }

  response.render('', null);
  log.render(entries);
  showPreview();
}
