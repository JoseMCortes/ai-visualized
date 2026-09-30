/**
 * A small fixed vocabulary for the playground, on the same
 * [function-word, thing-ness, action-ness] axes as the training example.
 * Nothing here is learned — only W_Q/W_K/W_V are — so a new sentence is
 * genuine inference through whatever the matrices have learned so far, the
 * same mechanism training itself uses, never a special case.
 */

export interface VocabEntry {
  word: string;
  embedding: [number, number, number];
}

export const VOCAB: VocabEntry[] = [
  { word: 'the', embedding: [1.0, 0.0, 0.0] },
  { word: 'a', embedding: [1.0, 0.0, 0.0] },
  { word: 'cat', embedding: [0.0, 1.0, 0.5] },
  { word: 'dog', embedding: [0.0, 1.0, 0.5] },
  { word: 'bird', embedding: [0.0, 0.9, 0.6] },
  { word: 'sat', embedding: [0.0, 0.5, 1.0] },
  { word: 'ran', embedding: [0.0, 0.4, 1.0] },
  { word: 'flew', embedding: [0.0, 0.3, 1.0] },
  { word: 'slept', embedding: [0.0, 0.5, 0.9] },
  { word: 'jumped', embedding: [0.0, 0.4, 1.0] },
];

/** Used for a word that isn't in the vocabulary — flagged in the UI, never silently guessed. */
export const UNKNOWN_EMBEDDING: [number, number, number] = [0.33, 0.33, 0.33];

const BY_WORD = new Map(VOCAB.map((e) => [e.word, e.embedding]));

export interface LookupResult {
  word: string;
  embedding: [number, number, number];
  known: boolean;
}

export function lookupWord(word: string): LookupResult {
  const key = word.toLowerCase();
  const embedding = BY_WORD.get(key);
  return embedding
    ? { word, embedding, known: true }
    : { word, embedding: UNKNOWN_EMBEDDING, known: false };
}

export function lookupSentence(sentence: string): LookupResult[] {
  return sentence.trim().split(/\s+/).filter(Boolean).map(lookupWord);
}
