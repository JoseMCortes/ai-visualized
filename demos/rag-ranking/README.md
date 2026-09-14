# Ranking Documents for RAG

Demo of [`ai-visualized`](../../README.md). Before an AI app can answer from
your documents, it has to find the right ones — that's a ranking problem, and
there is more than one way to solve it. This demo ranks the same 18 short
documents against the same handful of queries, six different ways, and shows
exactly how each score is computed.

**Live:** <https://josemcortes.github.io/ai-visualized/rag-ranking/>

## The six methods

1. **TF-IDF** — term frequency × inverse document frequency.
2. **BM25** — TF-IDF refined with term-frequency saturation and document-length
   normalisation.
3. **Embeddings + cosine similarity** — bag-of-embeddings vectors (trained by
   the same [skip-gram engine](../skipgram/) as the other embedding demos,
   here on a small background corpus) compared by cosine similarity.
4. **Hybrid search** — a tunable blend of BM25 and cosine, min-max normalised
   and combined with a slider.
5. **Cross-encoder (toy)** — a small linear model over hand-built "cross"
   features (term overlap, phrase adjacency, BM25, cosine), trained from
   scratch by gradient descent. Explicitly a toy: real cross-encoders are
   transformers reading the query and document as one input.
6. **Learning to Rank** — simplified LambdaMART: RankNet-style pairwise
   gradients boosted with small depth-2 regression trees, a few rounds at a
   time.

Methods 5 and 6 start **untrained** — every score is 0 until you press Step,
Play, or Run, training live on this demo's four hand-labelled example queries.

## Why the numbers are real, not scripted

Every ranking on screen is the actual output of the algorithm in
[`src/lib/`](./src/lib/), computed from this demo's 18 documents and its own
tiny, hand-authored relevance judgments (`src/corpus.ts`) — nothing is faked to
make a point. That's also why some results are imperfect: with a document set
this small, a paraphrase query for example moves its target from BM25's rank 8
to embeddings' rank 4 — a real improvement, not the rank-1 finish a bigger
corpus might give it.

## Run

```bash
npm install                 # from the repo root
npm run dev:rag-ranking
npm test --workspace @ai-visualized/rag-ranking
```
