/** A plain code block showing the real source that's running — updates when the provider changes. */

export interface CodePanel {
  el: HTMLElement;
  render(code: string): void;
}

export function createCodePanel(): CodePanel {
  const el = document.createElement('div');
  el.className = 'code-panel';
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.appendChild(code);
  el.appendChild(pre);

  function render(text: string): void {
    code.textContent = text;
  }

  return { el, render };
}
