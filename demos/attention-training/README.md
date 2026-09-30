# Training an Attention Head

Demo of [`ai-visualized`](../../README.md). Self-attention has three
learned matrices — W_Q, W_K, W_V — and this trains one real head on a
3-token, 3-dimensional toy example small enough to watch every number:
`"the cat sat"`, with "sat" as the query, learning to pull in information
from its subject, "cat".

**Live:** <https://josemcortes.github.io/ai-visualized/attention-training/>

## What you can do

- **Step / Play / Run 10** through repeated forward pass → MSE loss →
  hand-derived backprop → gradient-descent update, watching W_Q, W_K, W_V
  update live as shaded matrices, the attention weights as bars, a
  log-scale loss chart, and an attention-weight-vs-step chart.
- A plain-language sentence narrates each step: which matrix moved the
  most, which token gained attention, which lost it.
- **Part 2**: once trained, type any sentence built from a small fixed
  vocabulary and watch the exact same `forward()` function — no special
  case — process it through whatever the matrices currently are. An unknown
  word gets a neutral placeholder embedding, clearly flagged, never guessed.

## How it's built

`src/lib/model.ts` is the whole mechanism: `forward()` (project, scale by
1/√d, softmax, weighted sum) and a hand-derived `backward()` — no autograd.
Every gradient was checked against PyTorch's own autograd on this exact
example (see `src/lib/model.test.ts` — the expected values are PyTorch's
real printed output, not hand-derived numbers) and matches to the last
printed digit. `src/lib/trainer.ts` repeats that loop and tracks history for
the charts; `src/lib/inference.ts` reuses the same `forward()` for Part 2.

One honest finding worth calling out: attention shifts toward "cat" as
training converges, but doesn't fully overtake "sat" attending to itself —
most of the actual fix comes from W_V reshaping the values, not from
attention isolating the subject. That's what this specific toy example
does, verified against real gradients, not a simplification for the demo.

## Run

```bash
npm install                     # from the repo root
npm run dev:attention-training
npm test --workspace @ai-visualized/attention-training
```
