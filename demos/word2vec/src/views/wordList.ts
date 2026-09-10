/** The panel of tracked words (most frequent first). Click one to inspect it. */

export interface WordList {
  render(vocab: string[], counts: number[], focus: string | null): void;
}

export function createWordList(host: HTMLElement, onPick: (w: string | null) => void): WordList {
  host.classList.add('wordlist');

  function render(vocab: string[], counts: number[], focus: string | null): void {
    const order = vocab.map((w, i) => i).sort((a, b) => counts[b]! - counts[a]!);
    host.replaceChildren(
      ...order.map((i) => {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'wl-row' + (vocab[i] === focus ? ' is-on' : '');
        const w = document.createElement('span');
        w.className = 'wl-word';
        w.textContent = vocab[i]!;
        const c = document.createElement('span');
        c.className = 'wl-count';
        c.textContent = String(counts[i]);
        row.append(w, c);
        row.addEventListener('click', () => onPick(vocab[i] === focus ? null : vocab[i]!));
        return row;
      }),
    );
  }

  return { render };
}
