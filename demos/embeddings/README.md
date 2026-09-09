# Word Embeddings, Visualized

Demo of [`ai-visualized`](../../README.md). What a word embedding is: a word
becomes a vector, nearby means similar, and consistent relationships become
consistent directions.

**Live:** <https://josemcortes.github.io/ai-visualized/embeddings/>

## The two panels

- **A vector is just coordinates** — a dozen words placed by hand on two
  labelled axes (common↔royal, female↔male). Hover for nearest neighbours;
  toggle the analogy to watch `king − man + woman` land on `queen`.
- **Real embeddings** — ~250 words from [GloVe](https://nlp.stanford.edu/projects/glove/)
  (50-dimensional), flattened to 2-D. Hover or **look up** a word for its
  nearest neighbours by cosine similarity; edit the **analogy** (`a − b + d`)
  to move along a direction. Switch the **projection** between PCA (keeps the
  directions with the most spread) and t-SNE (keeps neighbourhoods).

## How it's built

The browser only ever does three things: cosine similarity, a sort, and one
vector add/subtract. See [`src/lib/vectors.ts`](./src/lib/vectors.ts).

Anything heavier is done once, offline: [`data/build_embeddings.py`](./data/build_embeddings.py)
takes GloVe, keeps a curated vocabulary, computes the PCA and t-SNE layouts,
and writes [`public/embeddings.json`](./public/) (~90 KB, committed). See
[`data/README.md`](./data/README.md).

## Run

```bash
npm install                 # from the repo root
npm run dev:embeddings
npm test --workspace @ai-visualized/embeddings
```
