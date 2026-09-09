/** Loads embeddings.json and wraps it with a few convenience lookups. */

import {
  analogy,
  cosineSimilarity,
  lerp,
  nearestNeighbors,
  projectPCA,
  type Neighbor,
  type Vec,
} from './vectors';

export type LayoutName = 'pca' | 'tsne';

export interface EmbeddingsJSON {
  source: string;
  dim: number;
  count: number;
  words: string[];
  categories: string[];
  vectors: number[][];
  layouts: Record<LayoutName, [number, number][]>;
  pcaProjection: { mean: number[]; axes: [number[], number[]] };
}

export class EmbeddingSet {
  readonly data: EmbeddingsJSON;
  private readonly index: Map<string, number>;

  constructor(data: EmbeddingsJSON) {
    this.data = data;
    this.index = new Map(data.words.map((w, i) => [w, i]));
  }

  get words(): string[] {
    return this.data.words;
  }

  has(word: string): boolean {
    return this.index.has(word);
  }

  indexOf(word: string): number {
    const i = this.index.get(word);
    if (i === undefined) throw new Error(`"${word}" is not in this set`);
    return i;
  }

  vector(word: string): Vec {
    return this.data.vectors[this.indexOf(word)]!;
  }

  category(word: string): string {
    return this.data.categories[this.indexOf(word)]!;
  }

  /** 2-D position of a word in the chosen layout. */
  point(word: string, layout: LayoutName): [number, number] {
    return this.data.layouts[layout][this.indexOf(word)]!;
  }

  similarity(a: string, b: string): number {
    return cosineSimilarity(this.vector(a), this.vector(b));
  }

  /** `k` nearest words to a raw vector, most similar first. */
  neighborsOf(vec: Vec, k: number, skipWords: string[] = []): (Neighbor & { word: string })[] {
    const skip = new Set(skipWords.filter((w) => this.has(w)).map((w) => this.indexOf(w)));
    return nearestNeighbors(vec, this.data.vectors, k, skip).map((n) => ({
      ...n,
      word: this.data.words[n.index]!,
    }));
  }

  /** The vector for "b is to a, as d is to ?" (a − b + d), and its nearest words. */
  analogy(a: string, b: string, d: string, k = 5) {
    const vec = analogy(this.vector(a), this.vector(b), this.vector(d));
    return { vec, results: this.neighborsOf(vec, k, [a, b, d]) };
  }

  /** A vector `t` of the way from word `a` to word `b`. */
  between(a: string, b: string, t: number): number[] {
    return lerp(this.vector(a), this.vector(b), t);
  }

  /** Project any raw vector onto the PCA layout (for analogy / interpolation points). */
  projectPCA(vec: Vec): [number, number] {
    const { mean, axes } = this.data.pcaProjection;
    return projectPCA(vec, mean, axes);
  }
}

export async function loadEmbeddings(url: string): Promise<EmbeddingSet> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to load ${url}: ${res.status}`);
  return new EmbeddingSet((await res.json()) as EmbeddingsJSON);
}
