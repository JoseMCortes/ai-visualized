/**
 * A small skip-gram embedding trainer — the same mechanism as the
 * "Training a Word Embedding" demo (one vector per word, nudged closer to
 * its neighbours and away from random words), sized down for this corpus:
 * ~100 words, so 8 dimensions and a couple thousand steps is enough, and it
 * trains once, instantly, when the page loads.
 *
 * A *document's* vector is just the average of its words' vectors — the
 * simplest way to turn a bag of word vectors into one document vector.
 */

import { EMBEDDING_BACKGROUND, type Doc } from '../corpus';
import { tokenize } from './tokenize';

export const DIM = 8;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MiniEmbeddings {
  readonly vocab: string[];
  readonly vectors: number[][];

  private readonly index: Map<string, number>;

  constructor(sentences: string[][], steps = 30000, seed = 7) {
    const rng = mulberry32(seed);
    const counts = new Map<string, number>();
    for (const s of sentences) for (const w of s) counts.set(w, (counts.get(w) ?? 0) + 1);
    this.vocab = [...counts.keys()];
    this.index = new Map(this.vocab.map((w, i) => [w, i]));
    this.vectors = this.vocab.map(() => Array.from({ length: DIM }, () => (rng() - 0.5) * 0.6));

    // negative-sampling table, weighted by count^0.75
    const negTable: number[] = [];
    for (const [w, c] of counts) {
      const n = Math.max(1, Math.round(Math.pow(c, 0.75) * 20));
      const id = this.index.get(w)!;
      for (let i = 0; i < n; i++) negTable.push(id);
    }

    // (center, context) pairs from a window of 3 within each sentence
    const window = 3;
    const pairs: [number, number][] = [];
    for (const s of sentences) {
      const ids = s.map((w) => this.index.get(w)!);
      for (let i = 0; i < ids.length; i++) {
        for (let j = Math.max(0, i - window); j <= Math.min(ids.length - 1, i + window); j++) {
          if (j !== i) pairs.push([ids[i]!, ids[j]!]);
        }
      }
    }
    if (pairs.length === 0) return;

    const lr = 0.05;
    const negatives = 4;
    for (let step = 0; step < steps; step++) {
      const [c, o] = pairs[Math.floor(rng() * pairs.length)]!;
      const cVec = this.vectors[c]!;
      const oVec = this.vectors[o]!;
      const before = cVec.slice();

      const score = (v: number[]): number => before.reduce((s, x, i) => s + x * v[i]!, 0);
      const gPos = sigmoid(score(oVec)) - 1;

      const negIds: number[] = [];
      for (let i = 0; i < negatives; i++) {
        negIds.push(negTable[Math.floor(rng() * negTable.length)]!);
      }
      const negG = negIds.map((id) => sigmoid(score(this.vectors[id]!)));

      for (let d = 0; d < DIM; d++) {
        let g = gPos * oVec[d]!;
        negIds.forEach((id, k) => (g += negG[k]! * this.vectors[id]![d]!));
        cVec[d] = cVec[d]! - lr * g;
      }
      for (let d = 0; d < DIM; d++) oVec[d] = oVec[d]! - lr * gPos * before[d]!;
      negIds.forEach((id, k) => {
        const v = this.vectors[id]!;
        for (let d = 0; d < DIM; d++) v[d] = v[d]! - lr * negG[k]! * before[d]!;
      });
    }
  }

  vectorOf(word: string): number[] {
    const i = this.index.get(word);
    return i === undefined ? new Array<number>(DIM).fill(0) : this.vectors[i]!;
  }

  /** Average the vectors of every known word in the text — a document (or query) vector. */
  bagVector(text: string): number[] {
    const words = tokenize(text).filter((w) => this.index.has(w));
    const out = new Array<number>(DIM).fill(0);
    if (words.length === 0) return out;
    for (const w of words) {
      const v = this.vectorOf(w);
      for (let d = 0; d < DIM; d++) out[d] += v[d]! / words.length;
    }
    return out;
  }
}

export function trainOnCorpus(docs: Doc[]): MiniEmbeddings {
  const sentences = [...docs.map((d) => d.text), ...EMBEDDING_BACKGROUND].map(tokenize);
  return new MiniEmbeddings(sentences);
}

export interface CosineBreakdown {
  query: number[];
  doc: number[];
  perDim: number[]; // query[d] * doc[d]
  dot: number;
  queryNorm: number;
  docNorm: number;
  cosine: number;
}

export function cosineBreakdown(queryVec: number[], docVec: number[]): CosineBreakdown {
  const perDim = queryVec.map((q, i) => q * docVec[i]!);
  const dot = perDim.reduce((a, b) => a + b, 0);
  const queryNorm = Math.hypot(...queryVec);
  const docNorm = Math.hypot(...docVec);
  const cosine = dot / ((queryNorm || 1) * (docNorm || 1));
  return { query: queryVec, doc: docVec, perDim, dot, queryNorm, docNorm, cosine };
}
