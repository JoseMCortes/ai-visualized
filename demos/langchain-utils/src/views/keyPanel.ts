/** Provider picker + API key field + model name field. */

import { PROVIDERS, type Provider } from '../lib/models';

export interface KeyPanelHandlers {
  onProvider(provider: Provider): void;
  onKeyChange(key: string): void;
  onModelChange(model: string): void;
  onClearKey(): void;
}

export interface KeyPanelState {
  provider: Provider;
  apiKey: string;
  model: string;
}

export interface KeyPanel {
  el: HTMLElement;
  render(state: KeyPanelState): void;
}

export function createKeyPanel(h: KeyPanelHandlers): KeyPanel {
  const el = document.createElement('div');
  el.className = 'key-panel';

  const tabs = document.createElement('div');
  tabs.className = 'kp-tabs';
  const tabEls = PROVIDERS.map((p) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'kp-tab';
    b.textContent = p.label;
    b.addEventListener('click', () => h.onProvider(p.id));
    tabs.appendChild(b);
    return b;
  });

  const row = document.createElement('div');
  row.className = 'kp-row';

  const keyField = document.createElement('label');
  keyField.className = 'kp-field kp-key-field';
  const keyLabel = document.createElement('span');
  keyLabel.className = 'kp-label';
  const keyInputWrap = document.createElement('div');
  keyInputWrap.className = 'kp-key-wrap';
  const keyInput = document.createElement('input');
  keyInput.type = 'password';
  keyInput.className = 'kp-key-input';
  keyInput.autocomplete = 'off';
  keyInput.spellcheck = false;
  const showBtn = document.createElement('button');
  showBtn.type = 'button';
  showBtn.className = 'kp-show-btn';
  showBtn.textContent = 'Show';
  showBtn.addEventListener('click', () => {
    const show = keyInput.type === 'password';
    keyInput.type = show ? 'text' : 'password';
    showBtn.textContent = show ? 'Hide' : 'Show';
  });
  keyInputWrap.append(keyInput, showBtn);
  keyField.append(keyLabel, keyInputWrap);

  keyInput.addEventListener('input', () => h.onKeyChange(keyInput.value));

  const modelField = document.createElement('label');
  modelField.className = 'kp-field kp-model-field';
  const modelLabel = document.createElement('span');
  modelLabel.className = 'kp-label';
  modelLabel.textContent = 'Model';
  const modelInput = document.createElement('input');
  modelInput.type = 'text';
  modelInput.className = 'kp-model-input';
  modelInput.spellcheck = false;
  modelInput.addEventListener('input', () => h.onModelChange(modelInput.value));
  modelField.append(modelLabel, modelInput);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'btn kp-clear-btn';
  clearBtn.textContent = 'Clear key';
  clearBtn.addEventListener('click', () => h.onClearKey());

  row.append(keyField, modelField, clearBtn);

  const hint = document.createElement('p');
  hint.className = 'kp-hint';

  const note = document.createElement('p');
  note.className = 'kp-note';
  note.innerHTML =
    'Your key is stored only in <strong>this browser</strong> (localStorage) and sent directly to the provider’s API when you press Run — never to any server we operate. Running the chain uses your own account and may incur a small real cost.';

  el.append(tabs, row, hint, note);

  function render(state: KeyPanelState): void {
    const info = PROVIDERS.find((p) => p.id === state.provider)!;
    tabEls.forEach((t, i) => t.classList.toggle('is-active', PROVIDERS[i]!.id === state.provider));
    keyLabel.textContent = `${info.label} API key`;
    keyInput.placeholder = info.keyPlaceholder;
    if (keyInput.value !== state.apiKey) keyInput.value = state.apiKey;
    if (modelInput.value !== state.model) modelInput.value = state.model;
    hint.innerHTML = `Get a key at <code>${info.keyHint}</code>.`;
  }

  return { el, render };
}
