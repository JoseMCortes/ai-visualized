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

**Live: <https://josemcortes.github.io/ai-visualized/>**

| Demo                                        |                                                                                                                                                                         |                                                                                                                                     |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Self-Attention, Visualized**              | a 0.8M-parameter char-level GPT running in-browser, its attention drawn as arcs and a heatmap, with token-by-token generation                                           | [live](https://josemcortes.github.io/ai-visualized/transformer/) · [`demos/transformer-attention/`](./demos/transformer-attention/) |
| **Word Embeddings, Visualized**             | words as vectors — nearby means similar, directions carry meaning; a hand-built toy plus ~250 real GloVe vectors                                                        | [live](https://josemcortes.github.io/ai-visualized/embeddings/) · [`demos/embeddings/`](./demos/embeddings/)                        |
| **Training a Word Embedding, Step by Step** | skip-gram forming an embedding one inspectable nudge at a time — pull the words that share context together                                                             | [live](https://josemcortes.github.io/ai-visualized/skipgram/) · [`demos/skipgram/`](./demos/skipgram/)                              |
| **Word2Vec, on Real Text**                  | the same algorithm on a whole book (or pasted text) — watch its frequent words drift into groups; click one for its neighbours                                          | [live](https://josemcortes.github.io/ai-visualized/word2vec/) · [`demos/word2vec/`](./demos/word2vec/)                              |
| **Prompt Injection, Visualized**            | a simulated (no real model) support bot to attack — try known injection techniques, toggle defenses, see exactly which one stops each and why                           | [live](https://josemcortes.github.io/ai-visualized/prompt-injection/) · [`demos/prompt-injection/`](./demos/prompt-injection/)      |
| **Ranking Documents for RAG**               | six document-ranking methods (TF-IDF → BM25 → embeddings → hybrid → a toy cross-encoder → learning to rank) on the same documents, every score broken down step by step | [live](https://josemcortes.github.io/ai-visualized/rag-ranking/) · [`demos/rag-ranking/`](./demos/rag-ranking/)                     |

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
  transformer-attention/   # self-attention visualizer
  embeddings/              # word embeddings visualizer
  skipgram/                # embedding-training visualizer (toy corpus)
  word2vec/                # embedding-training visualizer (real books)
  prompt-injection/        # prompt-injection attack/defense sandbox (simulated)
  rag-ranking/             # document-ranking methods for RAG, compared side by side
training/                  # PyTorch training + export for the GPT
landing/                   # the gallery page for the deployed site
```

Each demo is an npm workspace under `demos/`.

## Develop

```bash
npm install             # install all workspaces
npm test                # run every demo's unit tests
npm run build           # type-check + build every demo
npm run lint            # prettier --check
npm run dev:transformer # run the self-attention demo locally
npm run dev:embeddings  # run the embeddings demo locally
```

Requires Node ≥ 20.

## License

[MIT](./LICENSE) © Jose Cortes
