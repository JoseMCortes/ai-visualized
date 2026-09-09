/**
 * The GPT forward pass, from scratch — a direct port of `training/model.py`.
 *
 * One call to `forward(ids)` runs, for a sequence of `T` character ids:
 *
 *   embeddings   x[t] = tokenEmbedding[id[t]] + positionEmbedding[t]
 *   for each of the 4 blocks:
 *       x += attention( layerNorm(x) )      // positions mix, causally
 *       x += mlp(       layerNorm(x) )      // each position, on its own
 *   x = layerNorm(x)
 *   logits[t] = x[t] · tokenEmbeddingᵀ      // score for every next character
 *
 * It also records every head's softmax attention matrix so the UI can draw it.
 */

import { addInPlace, argmax, geluTanh, layerNorm, linear, softmax } from './linalg';
import { mulberry32, sampleFromLogits } from './sampling';
import type {
  ForwardOptions,
  ForwardTrace,
  GenerationStep,
  ModelConfig,
  SamplingOptions,
  Tensor,
  Vocab,
} from './types';

export class GPTModel {
  readonly config: ModelConfig;
  readonly vocab: Vocab;
  private readonly w: Map<string, Tensor>;

  constructor(config: ModelConfig, vocab: Vocab, weights: Map<string, Tensor>) {
    this.config = config;
    this.vocab = vocab;
    this.w = weights;
  }

  get blockSize(): number {
    return this.config.arch.block_size;
  }

  private mat(name: string): Tensor {
    const t = this.w.get(name);
    if (!t) throw new Error(`missing weight ${name}`);
    return t;
  }

  private vec(name: string): Float32Array {
    return this.mat(name).data;
  }

  encode(text: string): number[] {
    const fallback = this.vocab.stoi[' '] ?? 0;
    return [...text].map((ch) => this.vocab.stoi[ch] ?? fallback);
  }

  decode(ids: Iterable<number>): string {
    let s = '';
    for (const id of ids) s += this.vocab.itos[id] ?? '';
    return s;
  }

  forward(ids: number[], opts: ForwardOptions = {}): ForwardTrace {
    const { n_layer, n_head, n_embd } = this.config.arch;
    const eps = this.config.layernorm_eps;
    const T = ids.length;
    if (T === 0) throw new Error('forward() needs at least one token');
    if (T > this.blockSize) throw new Error(`sequence ${T} exceeds block size ${this.blockSize}`);
    const headDim = n_embd / n_head;
    const invSqrtHd = 1 / Math.sqrt(headDim);

    // 1. token + position embeddings --------------------------------------
    const wte = this.mat('wte.weight'); // [vocab, C]
    const wpe = this.mat('wpe.weight'); // [block, C]
    const x: number[][] = new Array(T);
    for (let t = 0; t < T; t++) {
      const row = new Array<number>(n_embd);
      const tokBase = ids[t]! * n_embd;
      const posBase = t * n_embd;
      for (let i = 0; i < n_embd; i++) row[i] = wte.data[tokBase + i]! + wpe.data[posBase + i]!;
      x[t] = row;
    }

    const attention: number[][][][] = [];
    const scores: number[][][][] = [];
    const residual: number[][][] = opts.residual ? [x.map((r) => r.slice())] : [];

    // 2. transformer blocks --------------------------------------------------
    for (let l = 0; l < n_layer; l++) {
      const p = `blocks.${l}.`;

      // --- causal self-attention on the normalized stream ---
      const xn = layerNorm(x, this.vec(p + 'ln_1.weight'), this.vec(p + 'ln_1.bias'), eps);
      const qkv = linear(xn, this.mat(p + 'attn.c_attn.weight'), this.vec(p + 'attn.c_attn.bias'));
      // qkv[t] is [q (C) | k (C) | v (C)]; within each, head h owns [h*hd, (h+1)*hd).

      const attnOut: number[][] = Array.from({ length: T }, () =>
        new Array<number>(n_embd).fill(0),
      );
      const layerAttention: number[][][] = [];
      const layerScores: number[][][] = [];

      for (let h = 0; h < n_head; h++) {
        const qOff = h * headDim;
        const kOff = n_embd + h * headDim;
        const vOff = 2 * n_embd + h * headDim;
        const headAttention: number[][] = new Array(T);
        const headScores: number[][] = new Array(T);

        for (let i = 0; i < T; i++) {
          // scaled dot-product scores against every key j <= i (causal)
          const rowScores = new Array<number>(i + 1);
          const qi = qkv[i]!;
          for (let j = 0; j <= i; j++) {
            const kj = qkv[j]!;
            let dot = 0;
            for (let d = 0; d < headDim; d++) dot += qi[qOff + d]! * kj[kOff + d]!;
            rowScores[j] = dot * invSqrtHd;
          }
          const weights = softmax(rowScores);

          // record full-width rows (masked-out future is 0 for weights, NaN for scores)
          const weightRow = new Array<number>(T).fill(0);
          const scoreRow = new Array<number>(T).fill(NaN);
          for (let j = 0; j <= i; j++) {
            weightRow[j] = weights[j]!;
            scoreRow[j] = rowScores[j]!;
          }
          headAttention[i] = weightRow;
          headScores[i] = scoreRow;

          // context vector = Σ_j weights[j] · value[j]
          const outI = attnOut[i]!;
          for (let j = 0; j <= i; j++) {
            const wj = weights[j]!;
            const vj = qkv[j]!;
            for (let d = 0; d < headDim; d++) outI[h * headDim + d] += wj * vj[vOff + d]!;
          }
        }
        layerAttention.push(headAttention);
        layerScores.push(headScores);
      }
      attention.push(layerAttention);
      scores.push(layerScores);

      const attnProj = linear(
        attnOut,
        this.mat(p + 'attn.c_proj.weight'),
        this.vec(p + 'attn.c_proj.bias'),
      );
      addInPlace(x, attnProj);

      // --- position-wise MLP on the normalized stream ---
      const xn2 = layerNorm(x, this.vec(p + 'ln_2.weight'), this.vec(p + 'ln_2.bias'), eps);
      const hidden = geluTanh(
        linear(xn2, this.mat(p + 'mlp.c_fc.weight'), this.vec(p + 'mlp.c_fc.bias')),
      );
      const mlpOut = linear(
        hidden,
        this.mat(p + 'mlp.c_proj.weight'),
        this.vec(p + 'mlp.c_proj.bias'),
      );
      addInPlace(x, mlpOut);

      if (opts.residual) residual.push(x.map((r) => r.slice()));
    }

    // 3. final norm + unembed (weight-tied to the token embedding) ----------
    const xf = layerNorm(x, this.vec('ln_f.weight'), this.vec('ln_f.bias'), eps);
    const logits = linear(xf, wte, null); // wte is [vocab, C] -> logits[t] is [vocab]

    return {
      ids: ids.slice(),
      nLayer: n_layer,
      nHead: n_head,
      attention,
      scores,
      residual,
      logits,
    };
  }

  /**
   * Autoregressive generation. Yields one step at a time so the caller can
   * animate: each step carries the sampled token, the full probability
   * distribution, and the forward trace (attention) that produced it.
   */
  *generate(
    promptIds: number[],
    options: SamplingOptions & { maxNewTokens: number; seed?: number },
  ): Generator<GenerationStep> {
    const rng = mulberry32(options.seed ?? Date.now() & 0xffffffff);
    const ids = promptIds.slice();

    for (let n = 0; n < options.maxNewTokens; n++) {
      const contextIds = ids.slice(-this.blockSize);
      const trace = this.forward(contextIds);
      const lastLogits = trace.logits[trace.logits.length - 1]!;
      const { id, probs } = sampleFromLogits(lastLogits, options, rng);
      ids.push(id);
      yield { id, char: this.vocab.itos[id] ?? '', probs, trace, contextIds };
    }
  }

  /** Convenience: greedy next-token id for a context. */
  nextGreedy(ids: number[]): number {
    const trace = this.forward(ids);
    return argmax(trace.logits[trace.logits.length - 1]!);
  }
}
