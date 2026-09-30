/** A plain code block — used to show the PyTorch reference this demo was checked against. */

export function createCodePanel(code: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'code-panel';
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  codeEl.textContent = code;
  pre.appendChild(codeEl);
  el.appendChild(pre);
  return el;
}
