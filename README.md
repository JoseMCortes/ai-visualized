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

## Live

- **Self-attention visualizer** → <https://josemcortes.github.io/ai-visualized/>

## Roadmap

Priority order. Status: 🟢 done · 🟡 in progress · ⚪ planned.

| #   | Demo                          | Theme                                                                                                         | Status |
| --- | ----------------------------- | ------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Self-attention visualizer** | tokens → Q/K/V → attention weights per head; tiny char-level GPT in-browser, generation with probability bars | 🟢     |
| 2   | Autograd / backprop engine    | micrograd-style scalar autograd, live computation graph, forward values + backward gradients                  | ⚪     |
| 3   | MLP training playground       | decision boundary evolving during training on spirals/moons; neurons, weights, activations                    | ⚪     |
| 4   | Tokenizer / BPE explorer      | watch BPE merges build a vocab; token boundaries on arbitrary text; compare tokenizers                        | ⚪     |
| 5   | Tiny diffusion model          | forward noising / reverse denoising on 2D distributions and small images, step by step                        | ⚪     |

### Backlog

- **Modern AI / LLM:** embeddings + mini RAG (2D projection, cosine similarity, chunk→embed→retrieve→prompt); decoding strategies (greedy / temperature / top-k / top-p / beam).
- **NN fundamentals:** CNN feature maps (draw a digit → filters → feature maps → pooling → classify, plus saliency); gradient descent & optimizers (loss landscape, SGD vs Momentum vs RMSProp vs Adam).
- **Classic ML:** k-means / DBSCAN; decision trees → random forest; k-NN / SVM (kernel trick); PCA.
- **RL / agents:** Q-learning on gridworld (value heatmap updating); ReAct agent trace; multi-armed bandits.

## Stack

- **TypeScript**, strict mode, no runtime dependencies in the core algorithm code.
- **Vite** for each demo app; **Canvas / WebGL** for the visuals.
- **Vitest** for unit tests on the algorithm implementations.
- Python (where a demo needs training) exports to the browser via ONNX Runtime
  Web / WebGPU so every demo stays zero-install.

## Layout

```
demos/
  transformer-attention/   # demo 1 — self-attention (live)
training/                  # PyTorch training + export for demo 1's model
docs/
  ROADMAP.md               # the list above, with detail
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
