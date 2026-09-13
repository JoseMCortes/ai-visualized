/** The attack gallery, the message box, the "include a document" toggle, and Send. */

import { ATTACKS } from '../lib/attacks';

export interface ComposerHandlers {
  onSend(userText: string): void;
  onToggleUntrusted(include: boolean): void;
}

export interface Composer {
  el: HTMLElement;
}

export function createComposer(h: ComposerHandlers): Composer {
  const el = document.createElement('div');
  el.className = 'composer';

  const galleryLabel = document.createElement('div');
  galleryLabel.className = 'field-label';
  galleryLabel.textContent = 'Try a known attack';
  const gallery = document.createElement('div');
  gallery.className = 'gallery';

  const presetNote = document.createElement('p');
  presetNote.className = 'preset-note';

  const untrustedRow = document.createElement('label');
  untrustedRow.className = 'toggle-row';
  const untrustedBox = document.createElement('input');
  untrustedBox.type = 'checkbox';
  const untrustedText = document.createElement('span');
  untrustedText.innerHTML =
    'Include a retrieved document (a bank statement the assistant is asked to summarize) — ' +
    '<strong>it has an instruction hidden inside it</strong>.';
  untrustedRow.append(untrustedBox, untrustedText);
  untrustedBox.addEventListener('change', () => h.onToggleUntrusted(untrustedBox.checked));

  for (const a of ATTACKS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn';
    b.textContent = a.label;
    b.addEventListener('click', () => {
      textarea.value = a.userText;
      presetNote.textContent = a.description;
      if (a.requiresUntrusted && !untrustedBox.checked) {
        untrustedBox.checked = true;
        h.onToggleUntrusted(true);
      }
      [...gallery.children].forEach((c) => c.classList.remove('is-on'));
      b.classList.add('is-on');
    });
    gallery.appendChild(b);
  }

  const composeLabel = document.createElement('div');
  composeLabel.className = 'field-label';
  composeLabel.textContent = 'Or write your own message';
  const textarea = document.createElement('textarea');
  textarea.rows = 3;
  textarea.value = ATTACKS[0]!.userText;
  presetNote.textContent = ATTACKS[0]!.description;
  gallery.firstElementChild?.classList.add('is-on');

  const sendRow = document.createElement('div');
  sendRow.className = 'send-row';
  const send = document.createElement('button');
  send.type = 'button';
  send.className = 'btn btn-primary';
  send.textContent = 'Send ▸';
  send.addEventListener('click', () => h.onSend(textarea.value));
  sendRow.appendChild(send);

  el.append(galleryLabel, gallery, presetNote, untrustedRow, composeLabel, textarea, sendRow);
  return { el };
}
