/**
 * Skip-gram with negative sampling, in 2 dimensions, from scratch.
 *
 * Each word has ONE 2-D vector (a point on the map) used both as the "center"
 * and as a "context" — a simplification of real word2vec, which keeps two
 * vectors per word. With one point per word the map *is* the model.
 *
 * One training step, given a center word C and one real neighbour O from the
 * text, plus a few random "negative" words N:
 *
 *   score  = C · X                     (how aligned are the two vectors)
 *   p      = sigmoid(score)            (predicted "these belong together")
 *   error  = p - target               (target 1 for O, 0 for each N)
 *   move X by  -lr * error * C         (and move C by the sum of its parts)
 *
 * Positive pair: error is negative, so O is pulled toward C.
 * Negative pair: error is positive, so N is pushed away from C.
 */

export type Vec2 = [number, number];

const MAX_NORM = 3.5;

export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Scale a vector down in place if it is longer than `max`. */
export function clampNorm(v: Vec2, max: number): void {
  const len = Math.hypot(v[0], v[1]);
  if (len > max) {
    v[0] = (v[0] / len) * max;
    v[1] = (v[1] / len) * max;
  }
}

export function dot(a: Vec2, b: Vec2): number {
  return a[0] * b[0] + a[1] * b[1];
}

/** Small seedable PRNG so a run can be reproduced. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Pair {
  centerId: number;
  contextId: number;
  sentenceIndex: number;
  centerPos: number;
  contextPos: number;
}

export interface WordScore {
  wordId: number;
  word: string;
  score: number; // center · word
  prob: number; // sigmoid(score)
  target: 0 | 1;
  error: number; // prob - target
}

export interface WordMove {
  wordId: number;
  word: string;
  before: Vec2;
  delta: Vec2; // what was added to the vector this step
}

export interface StepTrace {
  step: number;
  epoch: number;
  learningRate: number;
  center: { wordId: number; word: string; before: Vec2 };
  positive: WordScore;
  negatives: WordScore[];
  moves: WordMove[]; // center first, then positive, then negatives
  loss: number;
  location: { sentenceIndex: number; centerPos: number; contextPos: number };
}

export interface TrainerOptions {
  learningRate: number;
  windowSize: number;
  negatives: number;
}

export class SkipGramTrainer {
  readonly vocab: string[];
  readonly counts: number[];
  vectors: Vec2[];
  opts: TrainerOptions;
  step = 0;
  epoch = 0;

  private readonly tokenIds: number[][]; // sentences as word-id arrays
  private readonly negTable: number[]; // sampling table (unigram^0.75)
  private pairs: Pair[] = [];
  private order: number[] = [];
  private cursor = 0;
  private rng: () => number;
  private seed: number;

  constructor(sentences: string[][], opts: TrainerOptions, seed = 1) {
    this.opts = { ...opts };
    this.seed = seed;
    this.rng = mulberry32(seed);

    // vocabulary in first-seen order
    const index = new Map<string, number>();
    this.vocab = [];
    this.counts = [];
    this.tokenIds = sentences.map((tokens) =>
      tokens.map((w) => {
        let id = index.get(w);
        if (id === undefined) {
          id = this.vocab.length;
          index.set(w, id);
          this.vocab.push(w);
          this.counts.push(0);
        }
        this.counts[id]!++;
        return id;
      }),
    );

    // negative-sampling table: each word repeated ~ count^0.75 times
    this.negTable = [];
    this.counts.forEach((c, id) => {
      const n = Math.max(1, Math.round(Math.pow(c, 0.75) * 4));
      for (let i = 0; i < n; i++) this.negTable.push(id);
    });

    this.vectors = this.freshVectors();
    this.rebuildPairs();
  }

  private freshVectors(): Vec2[] {
    // Spread the starting points across the map so the initial scatter is
    // readable (word2vec inits smaller; here clarity wins).
    return this.vocab.map(() => [this.rng() * 4.4 - 2.2, this.rng() * 4.4 - 2.2]);
  }

  /** Re-randomise the vectors and start over (same seed unless given a new one). */
  reset(seed?: number): void {
    if (seed !== undefined) this.seed = seed;
    this.rng = mulberry32(this.seed);
    this.vectors = this.freshVectors();
    this.step = 0;
    this.epoch = 0;
    this.reshuffle();
  }

  /** Recompute the (center, context) pair list — call when the window changes. */
  rebuildPairs(): void {
    const w = this.opts.windowSize;
    this.pairs = [];
    this.tokenIds.forEach((ids, s) => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = Math.max(0, i - w); j <= Math.min(ids.length - 1, i + w); j++) {
          if (j === i) continue;
          this.pairs.push({
            centerId: ids[i]!,
            contextId: ids[j]!,
            sentenceIndex: s,
            centerPos: i,
            contextPos: j,
          });
        }
      }
    });
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

  /** The pair the next call to `runStep` will train on (for the corpus preview). */
  peekPair(): Pair {
    return this.pairs[this.order[this.cursor]!]!;
  }

  private sampleNegative(exclude: Set<number>): number {
    for (let tries = 0; tries < 50; tries++) {
      const id = this.negTable[Math.floor(this.rng() * this.negTable.length)]!;
      if (!exclude.has(id)) return id;
    }
    return this.negTable[0]!;
  }

  vector(word: string): Vec2 {
    const id = this.vocab.indexOf(word);
    return id < 0 ? [0, 0] : this.vectors[id]!;
  }

  positions(): { word: string; x: number; y: number }[] {
    return this.vocab.map((word, id) => ({
      word,
      x: this.vectors[id]![0],
      y: this.vectors[id]![1],
    }));
  }

  /** Do one nudge. Mutates the vectors and returns the full anatomy of the step. */
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
    const cBefore: Vec2 = [c[0], c[1]];

    const scoreOf = (v: Vec2): number => c[0] * v[0] + c[1] * v[1];

    // positive: the real neighbour, target 1
    const o = this.vectors[pair.contextId]!;
    const posScore = scoreOf(o);
    const pPos = sigmoid(posScore);
    const ePos = pPos - 1;

    // negatives: random words, target 0
    const exclude = new Set<number>([pair.centerId, pair.contextId]);
    const negIds: number[] = [];
    for (let i = 0; i < k; i++) {
      const id = this.sampleNegative(exclude);
      exclude.add(id);
      negIds.push(id);
    }
    const negScores: WordScore[] = negIds.map((id) => {
      const v = this.vectors[id]!;
      const p = sigmoid(scoreOf(v));
      return { wordId: id, word: this.vocab[id]!, score: scoreOf(v), prob: p, target: 0, error: p };
    });

    // gradients (using the pre-update center vector)
    const centerDelta: Vec2 = [-lr * ePos * o[0], -lr * ePos * o[1]];
    for (const ns of negScores) {
      const v = this.vectors[ns.wordId]!;
      centerDelta[0] += -lr * ns.error * v[0];
      centerDelta[1] += -lr * ns.error * v[1];
    }
    const posDelta: Vec2 = [-lr * ePos * cBefore[0], -lr * ePos * cBefore[1]];
    const negDeltas = negScores.map((ns): Vec2 => [
      -lr * ns.error * cBefore[0],
      -lr * ns.error * cBefore[1],
    ]);

    // record "before" positions, then apply
    const moves: WordMove[] = [];
    moves.push({
      wordId: pair.centerId,
      word: this.vocab[pair.centerId]!,
      before: cBefore,
      delta: centerDelta,
    });
    moves.push({
      wordId: pair.contextId,
      word: this.vocab[pair.contextId]!,
      before: [o[0], o[1]],
      delta: posDelta,
    });
    negScores.forEach((ns, i) => {
      const v = this.vectors[ns.wordId]!;
      moves.push({ wordId: ns.wordId, word: ns.word, before: [v[0], v[1]], delta: negDeltas[i]! });
    });

    c[0] += centerDelta[0];
    c[1] += centerDelta[1];
    o[0] += posDelta[0];
    o[1] += posDelta[1];
    negScores.forEach((ns, i) => {
      const v = this.vectors[ns.wordId]!;
      v[0] += negDeltas[i]![0];
      v[1] += negDeltas[i]![1];
    });

    // Keep vectors from flying off — clamp each to a maximum length.
    for (const id of [pair.centerId, pair.contextId, ...negIds])
      clampNorm(this.vectors[id]!, MAX_NORM);

    const loss =
      -Math.log(Math.max(pPos, 1e-9)) -
      negScores.reduce((sum, ns) => sum + Math.log(Math.max(1 - ns.prob, 1e-9)), 0);

    return {
      step: this.step,
      epoch: this.epoch,
      learningRate: lr,
      center: { wordId: pair.centerId, word: this.vocab[pair.centerId]!, before: cBefore },
      positive: {
        wordId: pair.contextId,
        word: this.vocab[pair.contextId]!,
        score: posScore,
        prob: pPos,
        target: 1,
        error: ePos,
      },
      negatives: negScores,
      moves,
      loss,
      location: {
        sentenceIndex: pair.sentenceIndex,
        centerPos: pair.centerPos,
        contextPos: pair.contextPos,
      },
    };
  }
}
