/**
 * Load the files written by `training/export.py` and reconstruct the model.
 *
 * `model.bin` layout (see config.json → bin_layout): for each tensor listed in
 * `config.tensors`, in order:
 *     float32  scale        (little-endian)
 *     int8[N]  quantized weights, row-major, N = product of shape
 * Dequantize with  w = q * scale.  `lm_head` reuses `wte.weight` (weight tying).
 */

import { GPTModel } from './model';
import type { ModelConfig, Tensor, Vocab } from './types';

/** Build a model from already-fetched parts (used by both the browser and tests). */
export function buildModel(config: ModelConfig, vocab: Vocab, bin: ArrayBuffer): GPTModel {
  const view = new DataView(bin);
  const weights = new Map<string, Tensor>();
  let offset = 0;

  for (const spec of config.tensors) {
    const count = spec.shape.reduce((a, b) => a * b, 1);
    const scale = view.getFloat32(offset, true);
    offset += 4;
    const q = new Int8Array(bin, offset, count);
    offset += count;

    const data = new Float32Array(count);
    for (let i = 0; i < count; i++) data[i] = q[i]! * scale;
    weights.set(spec.name, { data, shape: spec.shape.slice() });
  }

  if (offset !== bin.byteLength) {
    throw new Error(`model.bin: read ${offset} bytes, file is ${bin.byteLength}`);
  }
  return new GPTModel(config, vocab, weights);
}

/** Fetch config.json, vocab.json and model.bin from `baseUrl` and build the model. */
export async function loadModelFromUrl(baseUrl: string): Promise<GPTModel> {
  const base = baseUrl.replace(/\/$/, '');
  const [config, vocab, bin] = await Promise.all([
    fetch(`${base}/config.json`).then((r) => r.json() as Promise<ModelConfig>),
    fetch(`${base}/vocab.json`).then((r) => r.json() as Promise<Vocab>),
    fetch(`${base}/model.bin`).then((r) => r.arrayBuffer()),
  ]);
  return buildModel(config, vocab, bin);
}
