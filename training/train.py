"""
Train the tiny character-level GPT on tiny-shakespeare.

The model is deliberately small (~0.8M parameters): it trains in a few minutes
on an Apple-silicon GPU (MPS) or CPU, and quantizes down to roughly 1 MB so the
whole thing loads instantly in a browser.

    python prepare_data.py     # once, to create data/
    python train.py            # writes out/ckpt.pt (best val loss)

The training objective is next-character prediction: given characters
0..t, predict character t+1, averaged over every position in every sequence.
"""

import math
import os
import time

import numpy as np
import torch

from model import GPT, GPTConfig

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
OUT = os.path.join(HERE, "out")

# --- hyperparameters -------------------------------------------------------
block_size = 128          # context length: how many past chars the model sees
batch_size = 64
n_layer = 4
n_head = 4
n_embd = 128
dropout = 0.1

learning_rate = 1e-3
max_iters = 4000
warmup_iters = 100
lr_decay_iters = 4000
min_lr = 1e-4
weight_decay = 0.1
grad_clip = 1.0

eval_interval = 500
eval_iters = 100
seed = 1337
# ------------------------------------------------------------------------

device = (
    "mps"
    if torch.backends.mps.is_available()
    else ("cuda" if torch.cuda.is_available() else "cpu")
)
torch.manual_seed(seed)

meta = __import__("json").load(open(os.path.join(DATA, "meta.json"), encoding="utf-8"))
vocab_size = meta["vocab_size"]
itos = {int(k): v for k, v in meta["itos"].items()}

train_data = np.memmap(os.path.join(DATA, "train.bin"), dtype=np.uint16, mode="r")
val_data = np.memmap(os.path.join(DATA, "val.bin"), dtype=np.uint16, mode="r")


def get_batch(split: str):
    """Pick `batch_size` random windows of length block_size; y is x shifted by 1."""
    d = train_data if split == "train" else val_data
    ix = torch.randint(len(d) - block_size - 1, (batch_size,))
    x = torch.stack([torch.from_numpy(d[i : i + block_size].astype(np.int64)) for i in ix])
    y = torch.stack([torch.from_numpy(d[i + 1 : i + 1 + block_size].astype(np.int64)) for i in ix])
    return x.to(device), y.to(device)


cfg = GPTConfig(
    block_size=block_size,
    vocab_size=vocab_size,
    n_layer=n_layer,
    n_head=n_head,
    n_embd=n_embd,
    dropout=dropout,
    bias=True,
)
model = GPT(cfg).to(device)
n_params = sum(p.numel() for p in model.parameters())
print(f"{n_params / 1e6:.2f}M parameters | device = {device}")

optimizer = torch.optim.AdamW(
    model.parameters(), lr=learning_rate, weight_decay=weight_decay, betas=(0.9, 0.99)
)


def get_lr(it: int) -> float:
    """Linear warmup, then cosine decay down to min_lr."""
    if it < warmup_iters:
        return learning_rate * (it + 1) / (warmup_iters + 1)
    if it > lr_decay_iters:
        return min_lr
    ratio = (it - warmup_iters) / (lr_decay_iters - warmup_iters)
    coeff = 0.5 * (1.0 + math.cos(math.pi * ratio))
    return min_lr + coeff * (learning_rate - min_lr)


@torch.no_grad()
def estimate_loss() -> dict:
    out = {}
    model.eval()
    for split in ("train", "val"):
        losses = torch.zeros(eval_iters)
        for k in range(eval_iters):
            x, y = get_batch(split)
            _, loss = model(x, y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out


os.makedirs(OUT, exist_ok=True)
best_val = float("inf")
t0 = time.time()

for it in range(max_iters + 1):
    for g in optimizer.param_groups:
        g["lr"] = get_lr(it)

    if it % eval_interval == 0:
        losses = estimate_loss()
        dt = time.time() - t0
        print(
            f"iter {it:5d} | train {losses['train']:.4f} | val {losses['val']:.4f} "
            f"| lr {optimizer.param_groups[0]['lr']:.2e} | {dt:5.1f}s",
            flush=True,
        )
        if losses["val"] < best_val:
            best_val = losses["val"]
            torch.save(
                {"model": model.state_dict(), "config": model.config_dict(), "val_loss": best_val},
                os.path.join(OUT, "ckpt.pt"),
            )

    x, y = get_batch("train")
    _, loss = model(x, y)
    optimizer.zero_grad(set_to_none=True)
    loss.backward()
    torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
    optimizer.step()

print(f"done | best val loss {best_val:.4f} | {time.time() - t0:.1f}s", flush=True)

# --- a quick sample so we can eyeball what it learned ---------------------
model.eval()
start = torch.zeros((1, 1), dtype=torch.long, device=device)
ids = model.generate(start, 500, temperature=0.8, top_k=40)[0].tolist()
print("\n----- sample -----")
print("".join(itos[i] for i in ids))
print("------------------")
