# Self-Attention, Visualized

Demo 1 of [`ai-visualized`](../../README.md). A 0.8M-parameter character-level
GPT, trained on Shakespeare and re-implemented from scratch in TypeScript, runs
in the browser while its attention is drawn character by character.

## What you see

- **Arc diagram** — the characters on a line. For the focused character, an arc
  curves back to every earlier character it attends to; thicker and brighter =
  more weight. Hover any character to follow its attention.
- **Heatmap** — the whole `query × key` matrix for the chosen layer and head.
  Triangular, because a position can only look backwards.
- **Layer / Head** — pick any of the model's 4 × 4 attention patterns, or the
  mean over heads.

Both views are driven by the same real forward pass — type a new phrase and the
model re-runs.

## How it works

1. **Training** — [`training/`](../../training/) trains the model
   (nanoGPT-style: 4 layers, 4 heads, `n_embd` 128, context 128) and exports
   int8 weights to `public/model/` (~0.8 MB).
2. **Inference** — [`src/inference/`](./src/inference/) is a dependency-free
   port of the PyTorch model. `GPTModel.forward()` returns every head's
   attention matrix plus the logits; a parity test pins it to the trained
   model (agreement ~1e-6).
3. **Views** — [`src/views/`](./src/views/) render the attention with plain
   Canvas and SVG. [`src/store.ts`](./src/store.ts) is a ~15-line reactive
   store; there is no UI framework.

## Run

```bash
npm install                 # from the repo root
npm run dev:transformer      # dev server
npm test --workspace @ai-visualized/transformer-attention
```

## Status

- [x] Trained model + int8 export
- [x] From-scratch inference engine + parity test
- [x] Attention arc diagram + heatmap, layer/head selection
- [ ] Token-by-token generation with next-token probability bars
- [ ] Step-through of the forward pass; deploy to GitHub Pages
