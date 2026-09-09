/** Shapes of the files written by `training/export.py`, and of a forward pass. */

export interface Arch {
  block_size: number;
  vocab_size: number;
  n_layer: number;
  n_head: number;
  n_embd: number;
}

export interface ModelConfig {
  arch: Arch;
  layernorm_eps: number;
  gelu: 'tanh';
  tie_word_embeddings: boolean;
  quantization: string;
  bin_layout: string;
  tensors: { name: string; shape: number[] }[];
}

export interface Vocab {
  /** id -> character */
  itos: string[];
  /** character -> id */
  stoi: Record<string, number>;
}

/** A weight tensor after dequantization. `data` is row-major. */
export interface Tensor {
  data: Float32Array;
  shape: number[];
}

export interface ForwardOptions {
  /** Also return the residual-stream snapshot after each block (for the logit lens / step-through). */
  residual?: boolean;
}

export interface ForwardTrace {
  ids: number[];
  nLayer: number;
  nHead: number;
  /** attention[layer][head][queryPos][keyPos] — softmax weights, causal so [i][j] = 0 for j > i. */
  attention: number[][][][];
  /** residual[0] = embeddings; residual[l+1] = stream after block l. Empty unless `residual` was requested. */
  residual: number[][][];
  /** logits[pos][vocabId] — unnormalized next-token scores at every position. */
  logits: number[][];
}

export interface GenerationStep {
  /** The sampled token id and its character. */
  id: number;
  char: string;
  /** Full softmax over the vocabulary at this step (post-temperature), for the probability bars. */
  probs: number[];
  /** The forward pass that produced this token (attention is over `contextIds`). */
  trace: ForwardTrace;
  /** The (possibly truncated to block_size) context the model actually saw. */
  contextIds: number[];
}

export interface SamplingOptions {
  temperature?: number;
  /** Keep only the top K tokens before sampling. 0 = disabled. */
  topK?: number;
  /** Keep the smallest set of tokens whose probability sums to >= topP. 1 = disabled. */
  topP?: number;
}
