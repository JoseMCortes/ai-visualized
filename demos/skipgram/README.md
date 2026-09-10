# Training a Word Embedding, Step by Step

Demo of [`ai-visualized`](../../README.md). Where the
[embeddings demo](../embeddings/) shows a _finished_ embedding, this one shows
one _forming_ — skip-gram with negative sampling, run one inspectable nudge at
a time.

**Live:** <https://josemcortes.github.io/ai-visualized/skipgram/>

## What you can do

- **Step** — run exactly one nudge and freeze. The inspector shows every number:
  the (center, neighbour) pair, `p = sigmoid(C · w)` for the neighbour and for a
  few random negatives, the error against the target, and the exact move applied
  to each vector. The corpus panel marks where the pair came from; the map draws
  a green pull arrow, red push arrows, and the resulting slide.
- **Play** — do that on a timer.
- **Run 500** — fast-forward.
- Sliders for learning rate, context window, and number of negatives.

## How it's built

Embedding dimension is **2**, so the map is the model — no projection. One step
is four lines of maths (`dot → sigmoid → error → move`), no autograd. See
[`src/lib/skipgram.ts`](./src/lib/skipgram.ts); `runStep()` returns the full
`StepTrace` that drives all three panels. 9 unit tests, including one that runs
6000 steps and checks that same-topic words end up closer than cross-topic ones.

The corpus ([`src/corpus.ts`](./src/corpus.ts)) is ~30 telegraphic sentences in
three topics (animals · food · court) that share almost no context.

## Run

```bash
npm install                 # from the repo root
npm run dev:skipgram
npm test --workspace @ai-visualized/skipgram
```

## Caveat

Real word2vec uses billions of words, hundreds of dimensions, and two vectors
per word. At this scale, in 2-D, the topics separate by _direction_ more than
into three tidy blobs — the point is the mechanism, visible step by step.
