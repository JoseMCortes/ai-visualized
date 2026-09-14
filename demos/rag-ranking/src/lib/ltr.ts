/**
 * Learning to Rank, LambdaMART-style, simplified.
 *
 * Instead of hand-writing a scoring formula (like BM25) or fitting one flat
 * line to relevance (like the toy cross-encoder), gradient-boosted trees fit
 * many small trees in sequence, each one correcting the mistakes of all the
 * trees before it.
 *
 * The "Lambda" part: for every pair of documents under the same query where
 * one is known to be more relevant than the other, compute a pairwise
 * gradient (RankNet's) — how much and in which direction that pair "wants"
 * the two scores to move apart, using the current ensemble's scores:
 *
 *   ρ = 1 / (1 + exp(scoreHigh − scoreLow))     — how wrong the pair is now
 *   nudge the more-relevant doc's target up by ρ, the less-relevant one down
 *
 * Every document accumulates a nudge from every pair it appears in. A small
 * regression tree (depth 2 — one split, then one more on each side) is fit
 * to predict that nudge from the document's features, and its predictions
 * are added to the running score. Repeat for a few rounds.
 *
 * Simplified from real LambdaMART: a real implementation additionally
 * weights each pair by how much swapping the two documents would change a
 * ranking-quality metric (NDCG); this version weights every pair equally.
 */

import { FEATURE_NAMES, featureArray, type FeatureVector } from './features';
import type { PairStats } from './dataset';

export interface RankExample {
  queryId: string;
  docId: string;
  x: number[];
  relevance: number;
}

export function toRankExamples(pairs: PairStats[]): RankExample[] {
  return pairs.map((p) => ({
    queryId: p.queryId,
    docId: p.docId,
    x: featureArray(p.features),
    relevance: p.relevance,
  }));
}

export type TreeNode =
  | { isLeaf: true; value: number; n: number }
  | {
      isLeaf: false;
      featureIndex: number;
      threshold: number;
      left: TreeNode;
      right: TreeNode;
      gain: number;
    };

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

function sse(targets: number[]): number {
  const m = mean(targets);
  return targets.reduce((s, t) => s + (t - m) ** 2, 0);
}

function buildTree(rows: { x: number[]; target: number }[], depth: number): TreeNode {
  if (depth === 0 || rows.length < 4) {
    return { isLeaf: true, value: mean(rows.map((r) => r.target)), n: rows.length };
  }
  let best: { f: number; t: number; gain: number; left: typeof rows; right: typeof rows } | null =
    null;
  const parentSse = sse(rows.map((r) => r.target));

  for (let f = 0; f < FEATURE_NAMES.length; f++) {
    const values = [...new Set(rows.map((r) => r.x[f]!))].sort((a, b) => a - b);
    for (let i = 0; i < values.length - 1; i++) {
      const threshold = (values[i]! + values[i + 1]!) / 2;
      const left = rows.filter((r) => r.x[f]! <= threshold);
      const right = rows.filter((r) => r.x[f]! > threshold);
      if (left.length === 0 || right.length === 0) continue;
      const gain = parentSse - (sse(left.map((r) => r.target)) + sse(right.map((r) => r.target)));
      if (!best || gain > best.gain) best = { f, t: threshold, gain, left, right };
    }
  }

  if (!best || best.gain <= 1e-9) {
    return { isLeaf: true, value: mean(rows.map((r) => r.target)), n: rows.length };
  }
  return {
    isLeaf: false,
    featureIndex: best.f,
    threshold: best.t,
    gain: best.gain,
    left: buildTree(best.left, depth - 1),
    right: buildTree(best.right, depth - 1),
  };
}

export function predictTree(node: TreeNode, x: number[]): number {
  if (node.isLeaf) return node.value;
  return x[node.featureIndex]! <= node.threshold
    ? predictTree(node.left, x)
    : predictTree(node.right, x);
}

/** Sum of split gain per feature across the whole tree, for the importance chart. */
export function treeImportance(
  node: TreeNode,
  out: number[] = FEATURE_NAMES.map(() => 0),
): number[] {
  if (!node.isLeaf) {
    out[node.featureIndex] += node.gain;
    treeImportance(node.left, out);
    treeImportance(node.right, out);
  }
  return out;
}

export interface RoundResult {
  round: number;
  tree: TreeNode;
  scores: Map<string, number>; // docId+"|"+queryId -> score
  pairwiseLoss: number;
  importance: number[];
}

const key = (queryId: string, docId: string): string => `${queryId}|${docId}`;

export class LearningToRank {
  readonly trees: TreeNode[] = [];
  readonly learningRate: number;
  private readonly examples: RankExample[];
  private readonly byQuery: Map<string, RankExample[]>;
  private scores: Map<string, number>;

  constructor(examples: RankExample[], learningRate = 0.5) {
    this.examples = examples;
    this.learningRate = learningRate;
    this.byQuery = new Map();
    for (const e of examples) {
      const arr = this.byQuery.get(e.queryId) ?? [];
      arr.push(e);
      this.byQuery.set(e.queryId, arr);
    }
    this.scores = new Map(examples.map((e) => [key(e.queryId, e.docId), 0]));
  }

  score(queryId: string, docId: string): number {
    return this.scores.get(key(queryId, docId)) ?? 0;
  }

  private pairwiseLoss(): number {
    let loss = 0;
    let count = 0;
    for (const group of this.byQuery.values()) {
      for (const a of group) {
        for (const b of group) {
          if (a.relevance <= b.relevance) continue;
          const diff = this.score(a.queryId, a.docId) - this.score(b.queryId, b.docId);
          loss += Math.log(1 + Math.exp(-diff));
          count++;
        }
      }
    }
    return count ? loss / count : 0;
  }

  /** One boosting round: compute pairwise gradients, fit one tree, add it to the ensemble. */
  step(): RoundResult {
    const lambda = new Map<string, number>();
    for (const e of this.examples) lambda.set(key(e.queryId, e.docId), 0);

    for (const group of this.byQuery.values()) {
      for (const hi of group) {
        for (const lo of group) {
          if (hi.relevance <= lo.relevance) continue;
          const sHi = this.score(hi.queryId, hi.docId);
          const sLo = this.score(lo.queryId, lo.docId);
          const rho = 1 / (1 + Math.exp(sHi - sLo)); // how wrong the pair currently is
          lambda.set(key(hi.queryId, hi.docId), lambda.get(key(hi.queryId, hi.docId))! + rho);
          lambda.set(key(lo.queryId, lo.docId), lambda.get(key(lo.queryId, lo.docId))! - rho);
        }
      }
    }

    const rows = this.examples.map((e) => ({
      x: e.x,
      target: lambda.get(key(e.queryId, e.docId))!,
    }));
    const tree = buildTree(rows, 2);
    this.trees.push(tree);

    for (const e of this.examples) {
      const k = key(e.queryId, e.docId);
      this.scores.set(k, this.scores.get(k)! + this.learningRate * predictTree(tree, e.x));
    }

    const importance = this.trees.reduce(
      (acc, t) => treeImportance(t, acc),
      FEATURE_NAMES.map(() => 0),
    );

    return {
      round: this.trees.length,
      tree,
      scores: new Map(this.scores),
      pairwiseLoss: this.pairwiseLoss(),
      importance,
    };
  }

  reset(): void {
    this.trees.length = 0;
    this.scores = new Map(this.examples.map((e) => [key(e.queryId, e.docId), 0]));
  }
}

export type { FeatureVector };
