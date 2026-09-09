"""
Convert the trained checkpoint into three small files the browser can load,
plus one test fixture that pins the TypeScript forward pass to this one.

Written to demos/transformer-attention/public/model/ :

    config.json   architecture + the exact tensor layout of model.bin
    vocab.json    id <-> character mapping
    model.bin     every weight, quantized to int8 (per-tensor symmetric)

Written to demos/transformer-attention/src/inference/ :

    reference.fixture.json   one deterministic forward pass (input ids,
                             per-layer attention weights, logits) so the
                             port can assert byte-for-byte-ish parity.

Quantization: for a weight tensor W,   scale = max(|W|) / 127,
              store q = round(W / scale) as int8;  reload as  W ~= q * scale.
The reference forward pass below is computed from the *dequantized* weights,
so the TypeScript test compares like with like.

    python export.py
"""

import json
import os
import struct

import numpy as np
import torch

from model import GPT, GPTConfig

HERE = os.path.dirname(os.path.abspath(__file__))
CKPT = os.path.join(HERE, "out", "ckpt.pt")
DATA_META = os.path.join(HERE, "data", "meta.json")
BROWSER = os.path.abspath(os.path.join(HERE, "..", "demos", "transformer-attention", "public", "model"))
FIXTURE = os.path.abspath(os.path.join(HERE, "..", "demos", "transformer-attention", "src", "inference"))

# Prompt used for the parity fixture (kept short to keep the JSON small).
FIXTURE_PROMPT = "\nFirst Citizen:\nBefore we"


def tensor_order(cfg: dict) -> list[str]:
    """The exact order tensors are written into model.bin (and read in TS)."""
    names = ["wte.weight", "wpe.weight"]
    for i in range(cfg["n_layer"]):
        p = f"blocks.{i}."
        names += [
            p + "ln_1.weight", p + "ln_1.bias",
            p + "attn.c_attn.weight", p + "attn.c_attn.bias",
            p + "attn.c_proj.weight", p + "attn.c_proj.bias",
            p + "ln_2.weight", p + "ln_2.bias",
            p + "mlp.c_fc.weight", p + "mlp.c_fc.bias",
            p + "mlp.c_proj.weight", p + "mlp.c_proj.bias",
        ]
    names += ["ln_f.weight", "ln_f.bias"]
    return names


def quantize(w: np.ndarray) -> tuple[np.ndarray, float]:
    amax = float(np.abs(w).max())
    scale = amax / 127.0 if amax > 0 else 1.0
    q = np.clip(np.round(w / scale), -127, 127).astype(np.int8)
    return q, scale


def main() -> None:
    ckpt = torch.load(CKPT, map_location="cpu")
    cfg = ckpt["config"]
    sd = ckpt["model"]
    meta = json.load(open(DATA_META, encoding="utf-8"))
    print(f"loaded {CKPT}  (val loss {ckpt.get('val_loss', float('nan')):.4f})")

    names = tensor_order(cfg)

    os.makedirs(BROWSER, exist_ok=True)
    os.makedirs(FIXTURE, exist_ok=True)

    # --- model.bin + dequantized copy for the reference pass --------------
    bin_path = os.path.join(BROWSER, "model.bin")
    deq: dict[str, torch.Tensor] = {}
    with open(bin_path, "wb") as f:
        for name in names:
            w = sd[name].detach().cpu().float().numpy()
            q, scale = quantize(w)
            f.write(struct.pack("<f", scale))
            f.write(q.tobytes())
            deq[name] = torch.from_numpy(q.astype(np.float32) * scale)
    deq["lm_head.weight"] = deq["wte.weight"]  # tied

    bin_bytes = os.path.getsize(bin_path)
    print(f"wrote {bin_path}  ({bin_bytes / 1024:.0f} KB, {len(names)} tensors)")

    # --- config.json ----------------------------------------------------
    config_out = {
        "arch": {
            "block_size": cfg["block_size"],
            "vocab_size": cfg["vocab_size"],
            "n_layer": cfg["n_layer"],
            "n_head": cfg["n_head"],
            "n_embd": cfg["n_embd"],
        },
        "layernorm_eps": 1e-5,
        "gelu": "tanh",
        "tie_word_embeddings": True,
        "quantization": "per-tensor-symmetric-int8",
        "bin_layout": (
            "For each tensor in `tensors` order: little-endian float32 `scale`, "
            "then int8[prod(shape)] row-major. Dequantize with w = q * scale. "
            "lm_head reuses wte.weight."
        ),
        "tensors": [{"name": n, "shape": list(sd[n].shape)} for n in names],
    }
    with open(os.path.join(BROWSER, "config.json"), "w", encoding="utf-8") as f:
        json.dump(config_out, f, indent=2)
    print(f"wrote {os.path.join(BROWSER, 'config.json')}")

    # --- vocab.json ---------------------------------------------------
    itos = [meta["itos"][str(i)] for i in range(meta["vocab_size"])]
    with open(os.path.join(BROWSER, "vocab.json"), "w", encoding="utf-8") as f:
        json.dump({"itos": itos, "stoi": meta["stoi"]}, f, ensure_ascii=False, indent=2)
    print(f"wrote {os.path.join(BROWSER, 'vocab.json')}")

    # --- reference.fixture.json (dequantized weights, dropout off) --------
    model = GPT(GPTConfig(**cfg))
    msd = model.state_dict()
    for k in list(msd.keys()):
        if k in deq:
            msd[k] = deq[k]
    model.load_state_dict(msd)
    model.eval()

    stoi = meta["stoi"]
    ids = [stoi[ch] for ch in FIXTURE_PROMPT]
    x = torch.tensor([ids], dtype=torch.long)
    with torch.no_grad():
        logits, _ = model(x)

    attention = [
        np.round(block.attn.last_att[0].cpu().numpy(), 6).tolist()  # (nh, T, T)
        for block in model.blocks
    ]
    fixture = {
        "prompt": FIXTURE_PROMPT,
        "input_ids": ids,
        "attention": attention,  # [n_layer][n_head][T][T]
        "logits": np.round(logits[0].cpu().numpy(), 5).tolist(),  # [T][vocab]
        "argmax_last": int(logits[0, -1].argmax()),
        "tolerance": 2e-3,
    }
    with open(os.path.join(FIXTURE, "reference.fixture.json"), "w", encoding="utf-8") as f:
        json.dump(fixture, f)
    print(f"wrote {os.path.join(FIXTURE, 'reference.fixture.json')}  (T={len(ids)})")

    nxt = itos[fixture["argmax_last"]]
    print(f"\ngreedy next char after {FIXTURE_PROMPT!r} -> {nxt!r}")


if __name__ == "__main__":
    main()
