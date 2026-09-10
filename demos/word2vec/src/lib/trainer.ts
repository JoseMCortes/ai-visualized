/**
 * Skip-gram with negative sampling — the same engine as the `skipgram` demo,
 * but in `dim` dimensions (default 16, because 2-D collapses on real text) and
 * fed an already-tokenised, vocabulary-restricted corpus (see preprocess.ts).
 *
 * One step, given a center word C and one real neighbour O:
 *   score = C · X ;  p = sigmoid(score) ;  error = p - target   (1 for O, 0 for negatives)
 *   move X by  -lr * error * C           (and move C by the sum of its parts)
 *
 * The map shows a 2-D PCA view of these vectors (see pca.ts).
 */

export type Vec = number[];

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function dot(a: Vec, b: Vec): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StepTrace {
  step: number;
  epoch: number;
  centerId: number;
  positiveId: number;
  negativeIds: number[];
  /** cosine of the center with its positive, before this step (0..1-ish) */
  positiveCos: number;
  loss: number;
}

export interface TrainerOptions {
  learningRate: number;
  windowSize: number;
  negatives: number;
}

interface Pair {
  centerId: number;
  contextId: number;
}

export class Word2VecTrainer {
  readonly vocab: string[];
  readonly dim: number;
  vectors: Vec[];
  opts: TrainerOptions;
  step = 0;
  epoch = 0;

  private readonly sentences: number[][];
  private readonly negTable: number[];
  private pairs: Pair[] = [];
  private order: number[] = [];
  private cursor = 0;
  private rng: () => number;
  private seed: number;

  constructor(
    sentences: number[][],
    vocab: string[],
    counts: number[],
    opts: TrainerOptions,
    seed = 1,
    dim = 16,
  ) {
    this.vocab = vocab;
    this.dim = dim;
    this.sentences = sentences;
    this.opts = { ...opts };
    this.seed = seed;
    this.rng = mulberry32(seed);

    // negative-sampling table: each word ~ count^0.75 times
    this.negTable = [];
    const scale = Math.max(...counts.map((c) => Math.pow(c, 0.75)));
    counts.forEach((c, id) => {
      const n = Math.max(1, Math.round((Math.pow(c, 0.75) / scale) * 200));
      for (let i = 0; i < n; i++) this.negTable.push(id);
    });

    this.vectors = this.freshVectors();
    this.rebuildPairs();
  }

  private freshVectors(): Vec[] {
    // small, but not vanishing — a little initial structure to see
    return this.vocab.map(() => Array.from({ length: this.dim }, () => (this.rng() - 0.5) * 0.15));
  }

  reset(seed?: number): void {
    if (seed !== undefined) this.seed = seed;
    this.rng = mulberry32(this.seed);
    this.vectors = this.freshVectors();
    this.step = 0;
    this.epoch = 0;
    this.reshuffle();
  }

  rebuildPairs(): void {
    const w = this.opts.windowSize;
    this.pairs = [];
    for (const ids of this.sentences) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = Math.max(0, i - w); j <= Math.min(ids.length - 1, i + w); j++) {
          if (j !== i && ids[j] !== ids[i])
            this.pairs.push({ centerId: ids[i]!, contextId: ids[j]! });
        }
      }
    }
    this.reshuffle();
  }

  private reshuffle(): void {
    this.order = this.pairs.map((_, i) => i);
    for (let i = this.order.length - 1; i > 0; i--) {
      const k = Math.floor(this.rng() * (i + 1));
      [this.order[i], this.order[k]] = [this.order[k]!, this.order[i]!];
    }
    this.cursor = 0;
  }

  get pairCount(): number {
    return this.pairs.length;
  }

  private sampleNegative(exclude: Set<number>): number {
    for (let tries = 0; tries < 50; tries++) {
      const id = this.negTable[Math.floor(this.rng() * this.negTable.length)]!;
      if (!exclude.has(id)) return id;
    }
    return this.negTable[0]!;
  }

  vector(word: string): Vec {
    const id = this.vocab.indexOf(word);
    return id < 0 ? new Array(this.dim).fill(0) : this.vectors[id]!;
  }

  runStep(): StepTrace {
    if (this.cursor >= this.order.length) {
      this.epoch++;
      this.reshuffle();
    }
    const pair = this.pairs[this.order[this.cursor]!]!;
    this.cursor++;
    this.step++;

    const { learningRate: lr, negatives: k } = this.opts;
    const c = this.vectors[pair.centerId]!;
    const cBefore = c.slice();
    const d = this.dim;

    const scoreWith = (v: Vec): number => {
      let s = 0;
      for (let i = 0; i < d; i++) s += cBefore[i]! * v[i]!;
      return s;
    };

    const o = this.vectors[pair.contextId]!;
    const sPos = scoreWith(o);
    const pPos = sigmoid(sPos);
    const gPos = pPos - 1;

    const exclude = new Set<number>([pair.centerId, pair.contextId]);
    const negIds: number[] = [];
    for (let i = 0; i < k; i++) {
      const id = this.sampleNegative(exclude);
      exclude.add(id);
      negIds.push(id);
    }
    const negG = negIds.map((id) => sigmoid(scoreWith(this.vectors[id]!)));

    // center gradient = gPos*o + Σ gNeg*neg  ; apply -lr* that
    for (let i = 0; i < d; i++) {
      let g = gPos * o[i]!;
      for (let n = 0; n < negIds.length; n++) g += negG[n]! * this.vectors[negIds[n]!]![i]!;
      c[i] = c[i]! - lr * g;
    }
    for (let i = 0; i < d; i++) o[i] = o[i]! - lr * gPos * cBefore[i]!;
    negIds.forEach((id, n) => {
      const v = this.vectors[id]!;
      for (let i = 0; i < d; i++) v[i] = v[i]! - lr * negG[n]! * cBefore[i]!;
    });

    const loss =
      -Math.log(Math.max(pPos, 1e-9)) -
      negG.reduce((s, p) => s + Math.log(Math.max(1 - p, 1e-9)), 0);
    const cosPos = sPos / ((Math.hypot(...cBefore) || 1) * (Math.hypot(...o) || 1));

    return {
      step: this.step,
      epoch: this.epoch,
      centerId: pair.centerId,
      positiveId: pair.contextId,
      negativeIds: negIds,
      positiveCos: cosPos,
      loss,
    };
  }

  /** k nearest words to a word by cosine similarity (in the full space). */
  neighbors(word: string, k: number): { word: string; score: number }[] {
    const id = this.vocab.indexOf(word);
    if (id < 0) return [];
    const a = this.vectors[id]!;
    const na = Math.hypot(...a) || 1;
    return this.vocab
      .map((w, i) => ({
        word: w,
        score: dot(a, this.vectors[i]!) / (na * (Math.hypot(...this.vectors[i]!) || 1)),
      }))
      .filter((_, i) => i !== id)
      .sort((x, y) => y.score - x.score)
      .slice(0, k);
  }
}
