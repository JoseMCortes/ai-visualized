/** The four LCEL stages as connected boxes, each lighting up as it runs. */

export type StageStatus = 'idle' | 'active' | 'done' | 'error';

export interface PipelineStages {
  template: StageStatus;
  model: StageStatus;
  parser: StageStatus;
  result: StageStatus;
}

const STAGES: { id: keyof PipelineStages; label: string; sub: string }[] = [
  { id: 'template', label: 'Template', sub: 'fill {variables}' },
  { id: 'model', label: 'Model', sub: 'real API call' },
  { id: 'parser', label: 'Parser', sub: 'text → object' },
  { id: 'result', label: 'Result', sub: '' },
];

export interface Pipeline {
  el: HTMLElement;
  render(stages: PipelineStages): void;
}

export function createPipeline(): Pipeline {
  const el = document.createElement('div');
  el.className = 'pipeline';

  const boxEls = STAGES.map((s, i) => {
    const box = document.createElement('div');
    box.className = 'pl-box';
    box.dataset.stage = s.id;
    const dot = document.createElement('span');
    dot.className = 'pl-dot';
    const label = document.createElement('span');
    label.className = 'pl-label';
    label.textContent = s.label;
    const sub = document.createElement('span');
    sub.className = 'pl-sub';
    sub.textContent = s.sub;
    box.append(dot, label, sub);
    el.appendChild(box);
    if (i < STAGES.length - 1) {
      const arrow = document.createElement('span');
      arrow.className = 'pl-arrow';
      arrow.textContent = '→';
      el.appendChild(arrow);
    }
    return box;
  });

  function render(stages: PipelineStages): void {
    STAGES.forEach((s, i) => {
      boxEls[i]!.className = `pl-box is-${stages[s.id]}`;
    });
  }

  return { el, render };
}
