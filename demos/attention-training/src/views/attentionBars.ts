/** The attention weight each token receives — a bar per token, always summing to 100%. */

export interface AttentionBars {
  render(tokens: string[], weights: number[], queryIndex: number): void;
}

export function createAttentionBars(host: HTMLElement): AttentionBars {
  host.classList.add('attn-bars');

  function render(tokens: string[], weights: number[], queryIndex: number): void {
    const max = Math.max(...weights, 1e-9);
    host.replaceChildren(
      ...tokens.map((token, i) => {
        const row = document.createElement('div');
        row.className = 'attn-row' + (i === queryIndex ? ' is-query' : '');

        const label = document.createElement('span');
        label.className = 'attn-label';
        label.textContent = token;

        const track = document.createElement('span');
        track.className = 'attn-track';
        const fill = document.createElement('span');
        fill.className = 'attn-fill';
        fill.style.width = `${(weights[i]! / max) * 100}%`;
        track.appendChild(fill);

        const pct = document.createElement('span');
        pct.className = 'attn-pct';
        pct.textContent = `${(weights[i]! * 100).toFixed(1)}%`;

        row.append(label, track, pct);
        return row;
      }),
    );
  }

  return { render };
}
