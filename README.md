# ai-visualized

From-scratch, interactive **visual explainers** for modern AI and ML.

Every demo in this repo is built from first principles — no framework doing the
hard part — and pairs a working implementation with a step-by-step visualization
of the mechanism: connections lighting up, distributions being reshaped,
gradients flowing. The goal is to make each algorithm legible, not to wrap a
library.

## Why this repo exists

A visualization is hard to fake: to animate self-attention you have to compute
Q·Kᵀ, scale it, softmax it, and read every intermediate value back out. Each
demo therefore doubles as a readable reference implementation, with a short
write-up of the math and the design trade-offs.

## Demos

| Demo                          |                                                                                                                               |                                                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Self-attention visualizer** | a 0.8M-parameter char-level GPT running in-browser, its attention drawn as arcs and a heatmap, with token-by-token generation | [live](https://josemcortes.github.io/ai-visualized/) · [`demos/transformer-attention/`](./demos/transformer-attention/) |

More are planned (autograd, an MLP playground, a tokenizer explorer, a tiny
diffusion model, some classic ML) — added here as they land.

## Stack

- **TypeScript**, strict mode, no runtime dependencies in the core algorithm code.
- **Vite** for each demo app; **Canvas / WebGL** for the visuals.
- **Vitest** for unit tests on the algorithm implementations.
- Python (where a demo needs training) exports to the browser via ONNX Runtime
  Web / WebGPU so every demo stays zero-install.

## Layout

```
demos/
  transformer-attention/   # self-attention visualizer (live)
training/                  # PyTorch training + export for its model
```

Each demo is an npm workspace under `demos/`.

## Develop

```bash
npm install            # install all workspaces
npm test               # run every demo's unit tests
npm run build          # type-check + build every demo
npm run lint           # prettier --check
npm run dev:transformer # run the self-attention demo locally
```

Requires Node ≥ 20.

## License

[MIT](./LICENSE) © Jose Cortes
