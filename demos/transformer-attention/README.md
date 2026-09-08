# Self-Attention, Visualized

Demo 1 of [`ai-visualized`](../../README.md).

## What it will show

A single self-attention head, unrolled:

1. **Tokens → embeddings** — a short sentence becomes rows of a matrix.
2. **Q / K / V projections** — three linear maps of the same input.
3. **Scores** — `Q · Kᵀ`, every query against every key.
4. **Scale** — divide by `√d_k` to keep the softmax in a sane range.
5. **Softmax** — each query's scores become a distribution over keys.
6. **Weighted sum** — `weights · V` gives each position its context vector.

The visualization animates steps 3–6: connections between tokens light up in
proportion to the attention weight, one head at a time.

Stretch goal: a tiny char-level GPT running in-browser, with live next-token
probability bars.

## Code

`src/attention.ts` is the from-scratch implementation — `softmax`, `matmul`,
`transpose`, and `scaledDotProductAttention`, which returns every intermediate
(`scores`, `scaledScores`, `weights`, `output`) for the renderer to draw.

`src/attention.test.ts` covers it with Vitest.

## Run

```bash
npm install                 # from the repo root
npm run dev:transformer     # or: npm run dev  (from this folder)
npm test --workspace @ai-visualized/transformer-attention
```
