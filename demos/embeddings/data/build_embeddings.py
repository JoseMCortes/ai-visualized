"""
Build the small embedding set the demo ships.

Takes GloVe 6B 50-d word vectors, keeps a curated ~250-word vocabulary grouped
into clear categories, and writes `public/embeddings.json` with:

  - the raw 50-d vector for each word          (for cosine similarity + analogy)
  - a 2-D PCA layout and a 2-D t-SNE layout    (two ways to place the words)
  - the PCA mean + axes                        (so the browser can drop an
                                                arbitrary vector onto the PCA plot)

Everything the browser does with this is simple: dot products and a sort. The
only heavier maths (PCA, t-SNE) happens here, once, offline.

Usage:
    # glove.6B.50d.txt comes from https://nlp.stanford.edu/data/glove.6B.zip
    python build_embeddings.py path/to/glove.6B.50d.txt
"""

import json
import os
import sys

import numpy as np
from sklearn.manifold import TSNE

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "public", "embeddings.json"))

# Curated vocabulary. Groups are chosen so clusters are obvious and the classic
# analogies work: king - man + woman = queen, paris - france + germany = berlin,
# walked - walk + run = ran, and so on.
VOCAB: dict[str, list[str]] = {
    "royalty": ["king", "queen", "prince", "princess", "duke", "throne", "crown", "royal", "palace"],
    "family": [
        "man", "woman", "boy", "girl", "father", "mother", "son", "daughter",
        "brother", "sister", "uncle", "aunt", "husband", "wife", "child", "parent",
    ],
    "country": [
        "france", "germany", "spain", "italy", "portugal", "japan", "china", "india",
        "russia", "england", "canada", "mexico", "brazil", "egypt", "greece", "norway",
        "sweden", "poland", "turkey",
    ],
    "capital": [
        "paris", "berlin", "madrid", "rome", "lisbon", "tokyo", "beijing", "moscow",
        "london", "ottawa", "oslo", "stockholm", "warsaw", "athens", "cairo",
    ],
    "animal": [
        "dog", "cat", "horse", "cow", "pig", "sheep", "goat", "lion", "tiger", "bear",
        "wolf", "fox", "rabbit", "mouse", "deer", "elephant", "monkey", "snake",
    ],
    "bird": ["eagle", "hawk", "owl", "robin", "sparrow", "crow", "duck", "goose", "swan"],
    "number": [
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "twenty", "hundred", "thousand", "million",
    ],
    "color": ["red", "green", "blue", "yellow", "black", "white", "orange", "purple", "pink", "brown"],
    "food": ["bread", "cheese", "butter", "milk", "egg", "meat", "fish", "rice", "soup", "cake", "sugar", "salt"],
    "fruit": ["apple", "banana", "grape", "lemon", "peach", "pear", "cherry", "strawberry"],
    "drink": ["water", "wine", "beer", "coffee", "tea", "juice"],
    "verb": [
        "walk", "run", "jump", "swim", "fly", "eat", "drink", "sleep", "go", "come",
        "see", "take", "give", "speak", "write", "sing",
    ],
    "verb_past": [
        "walked", "ran", "jumped", "swam", "flew", "ate", "drank", "slept", "went",
        "came", "saw", "took", "gave", "spoke", "wrote", "sang",
    ],
    "weather": ["rain", "snow", "sun", "wind", "cloud", "storm", "fog", "ice", "heat"],
    "size": ["big", "small", "large", "tiny", "huge", "little", "tall", "short", "wide"],
    "temperature": ["hot", "cold", "warm", "cool", "freezing"],
    "body": ["hand", "foot", "head", "eye", "ear", "nose", "mouth", "arm", "leg", "heart", "brain"],
    "time": ["day", "night", "morning", "evening", "week", "month", "year", "hour", "minute"],
    "transport": ["car", "bus", "train", "plane", "bike", "boat", "ship", "truck"],
}


def load_glove(path: str, wanted: set[str]) -> dict[str, np.ndarray]:
    found: dict[str, np.ndarray] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            word, _, rest = line.partition(" ")
            if word in wanted:
                found[word] = np.fromstring(rest, sep=" ", dtype=np.float32)
                if len(found) == len(wanted):
                    break
    return found


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: python build_embeddings.py path/to/glove.6B.50d.txt")

    wanted = {w for words in VOCAB.values() for w in words}
    vectors = load_glove(sys.argv[1], wanted)

    missing = sorted(wanted - vectors.keys())
    if missing:
        print(f"note: {len(missing)} words not in GloVe, dropped: {', '.join(missing)}")

    words: list[str] = []
    categories: list[str] = []
    for category, group in VOCAB.items():
        for w in group:
            if w in vectors:
                words.append(w)
                categories.append(category)

    mat = np.stack([vectors[w] for w in words]).astype(np.float64)  # [N, 50]
    dim = mat.shape[1]
    print(f"{len(words)} words, {dim}-d")

    # --- PCA to 2-D, by hand: centre, SVD, keep the top two directions ---
    mean = mat.mean(axis=0)
    centred = mat - mean
    _, _, vt = np.linalg.svd(centred, full_matrices=False)
    axes = vt[:2]                       # [2, 50]
    pca_coords = centred @ axes.T       # [N, 2]
    scale = float(np.abs(pca_coords).max()) or 1.0
    pca_coords /= scale                 # roughly fit [-1, 1]
    axes_scaled = axes / scale          # so browser-projected vectors match

    # --- t-SNE to 2-D (a different, neighbourhood-preserving layout) ---
    tsne = TSNE(
        n_components=2, perplexity=15, init="pca", random_state=0, max_iter=1000
    ).fit_transform(mat)
    tsne -= tsne.mean(axis=0)
    tsne /= np.abs(tsne).max() or 1.0

    out = {
        "source": "GloVe 6B 50d — Pennington, Socher & Manning, 2014 (PDDL)",
        "dim": dim,
        "count": len(words),
        "words": words,
        "categories": categories,
        "vectors": [[round(v, 4) for v in row] for row in mat.tolist()],
        "layouts": {
            "pca": [[round(x, 4), round(y, 4)] for x, y in pca_coords.tolist()],
            "tsne": [[round(x, 4), round(y, 4)] for x, y in tsne.tolist()],
        },
        "pcaProjection": {
            "mean": [round(v, 4) for v in mean.tolist()],
            "axes": [[round(v, 6) for v in row] for row in axes_scaled.tolist()],
        },
    }

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}  ({os.path.getsize(OUT) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
