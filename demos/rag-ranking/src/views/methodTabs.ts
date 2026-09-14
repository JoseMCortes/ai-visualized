/** The six ranking methods, as tabs, each with a one-line description underneath when active. */

export type MethodId = 'tfidf' | 'bm25' | 'embeddings' | 'hybrid' | 'crossEncoder' | 'ltr';

export interface MethodDef {
  id: MethodId;
  label: string;
  description: string;
}

export const METHODS: MethodDef[] = [
  {
    id: 'tfidf',
    label: 'TF-IDF',
    description:
      'Score by how often each query word appears in a document, weighted up for rarer words.',
  },
  {
    id: 'bm25',
    label: 'BM25',
    description:
      'TF-IDF, refined: extra repeats of a word count for less, and long documents are discounted.',
  },
  {
    id: 'embeddings',
    label: 'Embeddings + cosine',
    description:
      'Compare the meaning of the query and document as trained vectors, not their exact words.',
  },
  {
    id: 'hybrid',
    label: 'Hybrid search',
    description:
      'Blend the lexical (BM25) and semantic (embeddings) scores — drag the dial between them.',
  },
  {
    id: 'crossEncoder',
    label: 'Cross-encoder (toy)',
    description:
      'A small model trained from scratch to score the query and document jointly, not separately.',
  },
  {
    id: 'ltr',
    label: 'Learning to Rank',
    description:
      'Small decision trees, boosted round by round, combining every earlier signal into one ranking.',
  },
];

export interface MethodTabs {
  el: HTMLElement;
  setActive(id: MethodId): void;
}

export function createMethodTabs(onSelect: (id: MethodId) => void): MethodTabs {
  const el = document.createElement('div');
  el.className = 'method-tabs';
  const buttons = new Map<MethodId, HTMLButtonElement>();

  for (const m of METHODS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn method-tab';
    b.textContent = m.label;
    b.addEventListener('click', () => onSelect(m.id));
    buttons.set(m.id, b);
    el.appendChild(b);
  }

  function setActive(id: MethodId): void {
    for (const [mid, b] of buttons) b.classList.toggle('is-on', mid === id);
  }

  return { el, setActive };
}
