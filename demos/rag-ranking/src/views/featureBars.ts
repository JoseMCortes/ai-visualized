/** A small horizontal bar per feature — used for the cross-encoder's learned weights and the LTR feature importance. */

export interface FeatureBarRow {
  label: string;
  value: number;
}

export interface FeatureBars {
  el: HTMLElement;
  render(rows: FeatureBarRow[]): void;
}

export function createFeatureBars(title: string): FeatureBars {
  const el = document.createElement('div');
  el.className = 'feature-bars';
  const heading = document.createElement('div');
  heading.className = 'field-label';
  heading.textContent = title;
  const rowsHost = document.createElement('div');
  rowsHost.className = 'feature-bars-rows';
  el.append(heading, rowsHost);

  function render(rows: FeatureBarRow[]): void {
    const maxAbs = Math.max(...rows.map((r) => Math.abs(r.value)), 1e-9);
    rowsHost.replaceChildren(
      ...rows.map((r) => {
        const row = document.createElement('div');
        row.className = 'fb-row';
        const label = document.createElement('span');
        label.className = 'fb-label';
        label.textContent = r.label;
        const bar = document.createElement('span');
        bar.className = 'fb-bar';
        const fill = document.createElement('span');
        fill.className = r.value < 0 ? 'is-negative' : '';
        fill.style.width = `${(Math.abs(r.value) / maxAbs) * 100}%`;
        bar.appendChild(fill);
        const value = document.createElement('span');
        value.className = 'fb-value';
        value.textContent = r.value.toFixed(2);
        row.append(label, bar, value);
        return row;
      }),
    );
  }

  return { el, render };
}
