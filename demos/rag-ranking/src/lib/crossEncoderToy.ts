/**
 * A toy "cross-encoder": instead of encoding the query and the document
 * separately and comparing them afterwards (like embeddings + cosine), a
 * cross-encoder looks at features of the *pair together* and learns to
 * predict relevance directly from them. Real cross-encoders are transformers
 * reading the query and document as one input; this one is a linear model
 * over the four hand-built cross features (see features.ts) — small enough
 * that every weight can be shown on screen, trained from scratch by gradient
 * descent on this demo's own hand-labelled examples.
 *
 * One training step = one epoch of full-batch gradient descent:
 *   predict      = w · features + bias
 *   error        = predict − target      (target = relevance / 3, so 0..1)
 *   loss         = mean(error²)  over every example
 *   gradient(w)  = mean(2 · error · features)     (and mean(2 · error) for bias)
 *   w, bias     -= learningRate × gradient
 */

import { FEATURE_NAMES, featureArray, type FeatureVector } from './features';
import type { PairStats } from './dataset';

export interface TrainExample {
  queryId: string;
  docId: string;
  features: FeatureVector;
  target: number; // relevance / 3, i.e. 0..1
}

export function toExamples(pairs: PairStats[]): TrainExample[] {
  return pairs.map((p) => ({
    queryId: p.queryId,
    docId: p.docId,
    features: p.features,
    target: p.relevance / 3,
  }));
}

export interface TrainStep {
  epoch: number;
  weights: number[];
  bias: number;
  loss: number;
}

export class CrossEncoderToy {
  weights: number[];
  bias = 0;
  epoch = 0;
  readonly learningRate: number;
  private readonly examples: TrainExample[];

  constructor(examples: TrainExample[], learningRate = 0.6) {
    this.examples = examples;
    this.weights = FEATURE_NAMES.map(() => 0);
    this.learningRate = learningRate;
  }

  predict(features: FeatureVector): number {
    const x = featureArray(features);
    return x.reduce((s, v, i) => s + v * this.weights[i]!, 0) + this.bias;
  }

  private loss(): number {
    const n = this.examples.length;
    return this.examples.reduce((s, e) => s + (this.predict(e.features) - e.target) ** 2, 0) / n;
  }

  /** One full-batch gradient descent epoch. */
  step(): TrainStep {
    const n = this.examples.length;
    const gradW = FEATURE_NAMES.map(() => 0);
    let gradB = 0;
    for (const e of this.examples) {
      const err = this.predict(e.features) - e.target;
      const x = featureArray(e.features);
      x.forEach((v, i) => (gradW[i] += (2 * err * v) / n));
      gradB += (2 * err) / n;
    }
    this.weights = this.weights.map((w, i) => w - this.learningRate * gradW[i]!);
    this.bias -= this.learningRate * gradB;
    this.epoch++;
    return { epoch: this.epoch, weights: [...this.weights], bias: this.bias, loss: this.loss() };
  }

  reset(): void {
    this.weights = FEATURE_NAMES.map(() => 0);
    this.bias = 0;
    this.epoch = 0;
  }
}
