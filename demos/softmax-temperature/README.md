# Softmax with Temperature

Demo of [`ai-visualized`](../../README.md). Softmax turns a list of raw scores
into a probability distribution; temperature `T` is the one dial that controls
how sharp or flat that distribution is. Drag it and watch every stage of the
arithmetic — and the resulting distribution's shape — update live.

**Live:** <https://josemcortes.github.io/ai-visualized/softmax-temperature/>

## What you can do

- **Pick a preset** — a clear winner, a close call, several plausible options,
  or real cosine-similarity scores for words nearest to "king" (reusing the
  [embeddings demo](../embeddings/)'s own GloVe data). Or edit any score by
  hand — up to 7 entries.
- **Drag T** (log scale, 0.05 to 20) and watch the per-row breakdown — score →
  `x/T` → `e^(x/T)` → probability — update live, plus the entropy meter.
- **Step** cycles through curated T checkpoints; **Play** sweeps T
  continuously low↔high so the reshaping is watched happening, not just
  read off two snapshots.
- The **probability-vs-temperature chart** plots every entry's curve across
  the whole T range at once, so the crossfade from "sharp" to "flat" is one
  picture instead of a slider you have to imagine interpolating.

## How it's built

Softmax computed from scratch, numerically stable (subtract the max scaled
score before exponentiating) — see [`src/lib/softmax.ts`](./src/lib/softmax.ts).
Shannon entropy (`-Σ p·ln p`, in nats) is the scalar summary of "how spread
out" the distribution is; [`src/lib/curve.ts`](./src/lib/curve.ts) samples
softmax at 60 log-spaced temperatures per vector to drive the chart. 13 unit
tests cover the T→0 (one-hot), T=1 (plain softmax), and T→∞ (uniform) limits,
entropy bounds, and that the ranking never reorders at any T.

The chart uses this repo's dataviz-skill-validated 8-color categorical
palette ([`src/lib/palette.ts`](./src/lib/palette.ts)) with a legend and
direct end-of-line labels as required secondary encoding (the CVD separation
sits in the "legal only with secondary encoding" band) — including a small
label-declutter pass so labels that converge at high T don't stack
illegibly on top of each other.

## Run

```bash
npm install                 # from the repo root
npm run dev:softmax-temperature
npm test --workspace @ai-visualized/softmax-temperature
```
