# WordPiece Tokenizer, Step by Step

Demo of [`ai-visualized`](../../README.md). The subword tokenizer BERT uses,
trained from scratch in the browser: every word starts split into single
characters, and one merge at a time — always the highest-scoring adjacent
pair — the vocabulary grows until fragments like `##ing` and `un` are
tokens of their own.

**Live:** <https://josemcortes.github.io/ai-visualized/wordpiece-tokenizer/>

## What you can do

- **Step / Play / Run 20** through training on a ~55-word toy corpus. Each
  step shows the candidate pairs considered, ranked by score, and the
  winner.
- **Watch words change live** — some are literally in the training corpus
  (you're watching the actual merge happen), others were never seen at all
  and are tokenized fresh against whatever vocabulary exists so far, so you
  can watch a novel word like `replaying` resolve into `replay` + `##ing`
  once the pieces it needs exist — real generalization, not a scripted
  example.
- **Type anything** into the playground and see it tokenized live against
  the current vocabulary — including honest `[UNK]` when a word can't be
  covered (try anything with a `v` — this corpus never has one).

## How it's built

`src/lib/wordpiece.ts` is the trainer: `score(pair) = freq(pair) /
(freq(left) * freq(right))` — that normalization, not raw frequency, is
WordPiece's actual difference from plain BPE. `src/lib/tokenize.ts` is
inference: greedy longest-match, and — a real, sometimes-surprising
property of the algorithm, not a simplification here — one uncovered
character sinks the _entire_ word to `[UNK]`, no partial credit. 17 unit
tests, including a hand-checked score tie and a determinism check (same
corpus trains identically every time).

## Run

```bash
npm install                      # from the repo root
npm run dev:wordpiece-tokenizer
npm test --workspace @ai-visualized/wordpiece-tokenizer
```

## Caveat

Real WordPiece vocabularies are trained on billions of words and stopped
early at a target size (often ~30,000 tokens) specifically so they still
generalize to unseen words. This toy corpus is small enough to train all
the way to the end, where every word collapses into a single whole-word
token — the point at which a real tokenizer would already have stopped.
