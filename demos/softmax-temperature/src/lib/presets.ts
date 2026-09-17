/**
 * Example score vectors. Each one is a plausible "raw scores before softmax"
 * situation — attention scores, next-token logits, or similarity scores — so
 * the temperature slider has something meaningfully different to act on.
 */

export interface Preset {
  id: string;
  label: string;
  description: string;
  labels: string[];
  scores: number[];
}

export const PRESETS: Preset[] = [
  {
    id: 'confident',
    label: 'One clear winner',
    description: 'One score stands well above the rest — like a model that is sure of its answer.',
    labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    scores: [1.0, 8.5, 0.5, -1.0, 2.0, 0.0, -0.5],
  },
  {
    id: 'close-call',
    label: 'A close call',
    description: 'Two scores are almost tied for the lead — a genuinely ambiguous choice.',
    labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    scores: [6.0, 6.4, 1.0, -2.0, 0.5, -1.5, 2.5],
  },
  {
    id: 'many-options',
    label: 'Several plausible options',
    description: 'A handful of scores sit close together — many roughly-equal candidates.',
    labels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    scores: [3.2, 2.8, 3.5, 3.0, 2.6, 3.1, 2.9],
  },
  {
    id: 'glove-king',
    label: "Real embeddings: nearest to 'king'",
    description:
      'Cosine similarity between the GloVe vector for "king" and seven others (×10, so the gaps are visible) — from the Word Embeddings demo\'s own data.',
    labels: ['prince', 'queen', 'throne', 'crown', 'man', 'woman', 'wolf'],
    scores: [8.24, 7.84, 7.54, 6.78, 5.31, 4.11, 3.32],
  },
];
