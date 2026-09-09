"""
Download the tiny-shakespeare corpus and turn it into training data.

tiny-shakespeare is ~1 MB of text from Shakespeare's plays. We train at the
*character* level, so the "tokenizer" is just: list the distinct characters,
sort them, and map each to its index. (Sub-word tokenization gets its own demo.)

Outputs, written next to this file under `data/`:

    input.txt   the raw corpus
    train.bin   the first 90% of the text as uint16 token ids
    val.bin     the last 10%, held out to measure generalisation
    meta.json   {stoi, itos, vocab_size} -- the char <-> id mapping
"""

import json
import os
import ssl
import urllib.request

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
DATA_URL = (
    "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt"
)


def _download(url: str) -> str:
    try:
        import certifi

        ctx = ssl.create_default_context(cafile=certifi.where())
    except Exception:
        ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
        return resp.read().decode("utf-8")


def main() -> None:
    os.makedirs(DATA, exist_ok=True)
    raw_path = os.path.join(DATA, "input.txt")

    if os.path.exists(raw_path):
        text = open(raw_path, encoding="utf-8").read()
        print(f"using cached {raw_path}")
    else:
        print(f"downloading {DATA_URL}")
        text = _download(DATA_URL)
        open(raw_path, "w", encoding="utf-8").write(text)

    chars = sorted(set(text))
    stoi = {ch: i for i, ch in enumerate(chars)}
    itos = {i: ch for i, ch in enumerate(chars)}
    print(f"{len(text):,} characters, vocab size {len(chars)}")

    ids = np.array([stoi[ch] for ch in text], dtype=np.uint16)
    n = int(0.9 * len(ids))
    ids[:n].tofile(os.path.join(DATA, "train.bin"))
    ids[n:].tofile(os.path.join(DATA, "val.bin"))

    with open(os.path.join(DATA, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(
            {
                "vocab_size": len(chars),
                "stoi": stoi,
                "itos": {str(i): ch for i, ch in itos.items()},
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"wrote train.bin ({n:,} ids), val.bin ({len(ids) - n:,} ids), meta.json")


if __name__ == "__main__":
    main()
