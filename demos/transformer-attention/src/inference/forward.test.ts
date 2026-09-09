/**
 * Parity test: the TypeScript forward pass must reproduce the PyTorch model.
 *
 * `training/export.py` wrote `reference.fixture.json` — one fixed prompt run
 * through the *dequantized* weights, capturing every head's attention matrix
 * and the output logits. Here we load the same `model.bin`, run our own
 * forward pass, and assert it matches. If the port ever drifts from the
 * trained model, this fails.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildModel } from './loadModel';
import { argmax } from './linalg';
import fixture from './reference.fixture.json';
import type { ModelConfig, Vocab } from './types';

const here = dirname(fileURLToPath(import.meta.url));
const modelDir = join(here, '..', '..', 'public', 'model');

function loadModel() {
  const config = JSON.parse(readFileSync(join(modelDir, 'config.json'), 'utf8')) as ModelConfig;
  const vocab = JSON.parse(readFileSync(join(modelDir, 'vocab.json'), 'utf8')) as Vocab;
  const buf = readFileSync(join(modelDir, 'model.bin'));
  const bin = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return buildModel(config, vocab, bin);
}

describe('forward parity with the PyTorch reference', () => {
  const model = loadModel();
  const trace = model.forward(fixture.input_ids, { residual: true });
  const tol = fixture.tolerance;

  it('reads model.bin cleanly and has the expected shape', () => {
    expect(trace.nLayer).toBe(fixture.attention.length);
    expect(trace.nHead).toBe(fixture.attention[0]!.length);
    expect(trace.logits.length).toBe(fixture.input_ids.length);
    expect(trace.residual.length).toBe(trace.nLayer + 1);
  });

  it('matches every head’s attention weights within tolerance', () => {
    let maxDiff = 0;
    for (let l = 0; l < fixture.attention.length; l++) {
      for (let h = 0; h < fixture.attention[l]!.length; h++) {
        for (let i = 0; i < fixture.attention[l]![h]!.length; i++) {
          const refRow = fixture.attention[l]![h]![i]!;
          const gotRow = trace.attention[l]![h]![i]!;
          for (let j = 0; j < refRow.length; j++) {
            maxDiff = Math.max(maxDiff, Math.abs(gotRow[j]! - refRow[j]!));
          }
        }
      }
    }
    expect(maxDiff).toBeLessThan(tol);
  });

  it('attention rows are causal and normalized', () => {
    for (const layer of trace.attention) {
      for (const head of layer) {
        head.forEach((row, i) => {
          const sum = row.reduce((a, b) => a + b, 0);
          expect(sum).toBeCloseTo(1, 5);
          for (let j = i + 1; j < row.length; j++) expect(row[j]).toBe(0);
        });
      }
    }
  });

  it('matches the output logits', () => {
    let maxDiff = 0;
    for (let t = 0; t < fixture.logits.length; t++) {
      for (let v = 0; v < fixture.logits[t]!.length; v++) {
        maxDiff = Math.max(maxDiff, Math.abs(trace.logits[t]![v]! - fixture.logits[t]![v]!));
      }
    }
    expect(maxDiff).toBeLessThan(0.05);
  });

  it('predicts the same greedy next token', () => {
    expect(argmax(trace.logits[trace.logits.length - 1]!)).toBe(fixture.argmax_last);
  });
});
