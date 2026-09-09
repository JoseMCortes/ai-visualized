# Roadmap

Detailed version of the table in the [README](../README.md). Priority order —
modern AI first, then neural-net fundamentals, then classic ML, then RL/agents.

## Quality bar (applies to every demo)

- Implemented from scratch; no framework doing the core computation.
- A `README.md` in the demo folder explaining the math and the design
  trade-offs.
- Unit tests on the algorithm code (`*.test.ts`, run by Vitest).
- The visualization exposes the real intermediates — not a cartoon.

## Starter set

### 1. Self-attention visualizer — _done_ · [live](https://josemcortes.github.io/ai-visualized/)

Tokens → embeddings → Q / K / V → scaled dot-product scores → softmax →
weighted sum, drawn as an arc diagram and a heatmap across a phrase, one head
at a time. A 0.8M-parameter char-level GPT (trained in `training/`, re-run from
scratch in TypeScript) generates text one character at a time with live
next-character probability bars and temperature / top-k / top-p controls, and a
panel breaks down how each attention weight is computed.

See `demos/transformer-attention/`.

### 2. Autograd / backprop engine

micrograd-style scalar autograd. Build an expression, show the computation
graph, run the forward pass with values on each node, then the backward pass
with gradients flowing back. Demonstrates the foundation the rest depends on.

### 3. MLP training playground

TensorFlow-Playground-style, from scratch. 2D datasets (spirals, moons, XOR);
watch the decision boundary evolve during training; inspect neurons, weights,
and activation functions.

### 4. Tokenizer / BPE explorer

Watch byte-pair-encoding merges build a vocabulary from a corpus. Visualize
token boundaries on arbitrary text; compare how different tokenizers split the
same string.

### 5. Tiny diffusion model

Forward process: progressively add noise to a 2D point distribution (and small
images). Reverse process: a small learned denoiser walks it back, step by step,
with the trajectory drawn out.

## Backlog

### Modern AI / LLM

- **Embeddings + mini RAG** — project embeddings to 2D, show cosine similarity
  and nearest neighbors, then a chunk → embed → retrieve → prompt pipeline with
  the retrieved context highlighted.
- **Decoding strategies** — greedy / temperature / top-k / top-p / beam;
  visualize the probability distribution being reshaped and the candidate tree
  expanding.

### Neural-net fundamentals

- **CNN feature maps** — draw a digit, watch conv filters → feature maps →
  pooling → classification, plus saliency maps.
- **Gradient descent & optimizers** — loss landscape with SGD vs Momentum vs
  RMSProp vs Adam trajectories; learning-rate effects.

### Classic ML

- **k-means / DBSCAN** — centroids moving, assignments per iteration.
- **Decision trees → random forest** — recursive splitting, information gain,
  then ensembling.
- **k-NN / SVM** — decision boundary, support vectors, the kernel trick.
- **PCA** — variance directions, projection, reconstruction error.

### RL / agents

- **Q-learning on gridworld** — value-function heatmap updating as the agent
  explores.
- **Agent loop / ReAct trace** — planning steps, tool calls, observations as a
  visual trace.
- **Multi-armed bandits** — exploration vs exploitation, regret curves.
