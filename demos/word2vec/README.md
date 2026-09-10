# Word2Vec, on Real Text

Demo of [`ai-visualized`](../../README.md). The same skip-gram engine as the
[step-by-step demo](../skipgram/), pointed at a whole book (or text you paste),
so you can watch a real vocabulary sort itself into groups.

**Live:** <https://josemcortes.github.io/ai-visualized/word2vec/>

## What it does

1. **Preprocess** ([`src/lib/preprocess.ts`](./src/lib/preprocess.ts)) — split
   into sentences and words, drop stop-words, keep the `N` most frequent
   content words, thin out the very common ones (word2vec subsampling). Those
   words are what the right-hand panel tracks.
2. **Train** ([`src/lib/trainer.ts`](./src/lib/trainer.ts)) — skip-gram with
   negative sampling, in **16 dimensions** (2-D collapses on real text). Step /
   Play / Run · sliders for learning rate, window, negatives.
3. **View** — the map is a 2-D **PCA** projection of the vectors
   ([`src/lib/pca.ts`](./src/lib/pca.ts)), rotated each refresh to line up with
   the previous one so it doesn't spin, and coloured by k-means cluster. Click a
   word to pin it and see its nearest neighbours by cosine similarity.

Bundled texts are Project Gutenberg (public domain); "Paste…" trains on your
own.

## Run

```bash
npm install                 # from the repo root
npm run dev:word2vec
npm test --workspace @ai-visualized/word2vec
```

## Caveat

One book is tiny next to a real word2vec corpus. Expect a dense middle of
generic words with the distinctive ones (e.g. Alice's _mock · turtle · gryphon
· soup_) pulling out into recognisable groups — suggestive, not authoritative.
