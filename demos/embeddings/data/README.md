# data/

Builds [`../public/embeddings.json`](../public/embeddings.json) — the ~250-word
embedding set the demo ships. Not run in CI; only needed to change the
vocabulary or the source vectors.

```bash
pip install -r requirements.txt

# GloVe 6B, 50-dimensional vectors (Pennington, Socher & Manning, 2014).
# The full download is ~820 MB; we only keep the 50-d file, ~160 MB.
curl -L -o glove.6B.zip https://nlp.stanford.edu/data/glove.6B.zip
unzip -p glove.6B.zip glove.6B.50d.txt > glove.6B.50d.txt

python build_embeddings.py glove.6B.50d.txt
```

## What it writes

| field                                      | meaning                                                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `words`, `categories`                      | the vocabulary and each word's group (parallel arrays)                                                                                        |
| `vectors`                                  | the raw 50-d GloVe vector per word — used for cosine similarity and analogy arithmetic                                                        |
| `layouts.pca`, `layouts.tsne`              | two 2-D placements of the words, each scaled to roughly [-1, 1]                                                                               |
| `pcaProjection.mean`, `pcaProjection.axes` | so the browser can project an arbitrary 50-d vector (e.g. an analogy result) onto the PCA layout with one subtraction and one matrix multiply |

PCA is done by hand (centre → SVD → first two directions); t-SNE uses
scikit-learn. The browser never does either — it only reads coordinates and
computes dot products.

GloVe vectors are released under the Public Domain Dedication and License.
