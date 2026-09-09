"""
A minimal GPT (decoder-only transformer), written to stay close to the maths so
the browser port in `demos/transformer-attention/src/inference/` can mirror it
almost line for line.

Shape names used throughout:

    B  = batch size
    T  = sequence length (number of tokens), always <= block_size
    C  = embedding dimension (n_embd)
    nh = number of attention heads
    hd = head dimension = C // nh

The forward pass, end to end:

    1. Look up a vector for each token id            -> token embeddings      (B,T,C)
    2. Add a vector for each *position* 0..T-1        -> +positional embeddings (B,T,C)
    3. For each transformer block:
         a. LayerNorm, then causal self-attention, added back onto the stream
         b. LayerNorm, then a 2-layer MLP, added back onto the stream
    4. A final LayerNorm
    5. Project back to vocabulary size                -> logits                (B,T,vocab)

"Causal" means position t can only attend to positions <= t, so the model can be
trained to predict the next token everywhere in the sequence at once.
"""

import math
from dataclasses import dataclass, asdict

import torch
import torch.nn as nn
import torch.nn.functional as F


def gelu(x: torch.Tensor) -> torch.Tensor:
    """The tanh approximation of GELU, the same one GPT-2 uses.

    GELU is a smooth version of ReLU: instead of a hard cutoff at 0 it lets a
    little signal through for small negatives. The tanh form is used here
    because it is trivial to reproduce exactly in JavaScript.
    """
    return 0.5 * x * (1.0 + torch.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * torch.pow(x, 3.0))))


class LayerNorm(nn.Module):
    """Normalise each token vector to mean 0 / variance 1, then rescale.

    Uses population variance (divide by C, not C-1) and eps = 1e-5, so the
    TypeScript port can match it exactly.
    """

    def __init__(self, dim: int, eps: float = 1e-5):
        super().__init__()
        self.weight = nn.Parameter(torch.ones(dim))
        self.bias = nn.Parameter(torch.zeros(dim))
        self.eps = eps

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mean = x.mean(dim=-1, keepdim=True)
        var = x.var(dim=-1, keepdim=True, unbiased=False)
        return (x - mean) / torch.sqrt(var + self.eps) * self.weight + self.bias


class CausalSelfAttention(nn.Module):
    """One multi-head self-attention layer.

    Each token produces a query, a key and a value vector (per head). The
    attention weight from token i to token j is softmax over (q_i . k_j),
    scaled by 1/sqrt(hd) and masked so j never exceeds i. The output for token
    i is that weighted average of the value vectors.
    """

    def __init__(self, cfg: "GPTConfig"):
        super().__init__()
        assert cfg.n_embd % cfg.n_head == 0
        self.n_head = cfg.n_head
        self.n_embd = cfg.n_embd

        # One linear layer produces q, k and v together, then we split.
        self.c_attn = nn.Linear(cfg.n_embd, 3 * cfg.n_embd, bias=cfg.bias)
        # Mixes the per-head outputs back together.
        self.c_proj = nn.Linear(cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.attn_dropout = nn.Dropout(cfg.dropout)
        self.resid_dropout = nn.Dropout(cfg.dropout)

        # Lower-triangular matrix of 1s: mask[i, j] = 1 iff j <= i.
        self.register_buffer(
            "mask",
            torch.tril(torch.ones(cfg.block_size, cfg.block_size)).view(
                1, 1, cfg.block_size, cfg.block_size
            ),
        )
        # The softmax attention weights from the most recent forward pass,
        # shape (B, nh, T, T). Saved so the visualiser has something to draw.
        self.last_att: torch.Tensor | None = None

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        B, T, C = x.shape
        hd = C // self.n_head

        q, k, v = self.c_attn(x).split(self.n_embd, dim=2)          # each (B, T, C)
        q = q.view(B, T, self.n_head, hd).transpose(1, 2)           # (B, nh, T, hd)
        k = k.view(B, T, self.n_head, hd).transpose(1, 2)
        v = v.view(B, T, self.n_head, hd).transpose(1, 2)

        att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(hd))     # (B, nh, T, T)
        att = att.masked_fill(self.mask[:, :, :T, :T] == 0, float("-inf"))
        att = F.softmax(att, dim=-1)
        self.last_att = att.detach()
        att = self.attn_dropout(att)

        y = att @ v                                                 # (B, nh, T, hd)
        y = y.transpose(1, 2).contiguous().view(B, T, C)            # (B, T, C)
        return self.resid_dropout(self.c_proj(y))


class MLP(nn.Module):
    """A position-wise 2-layer network: expand to 4*C, GELU, project back."""

    def __init__(self, cfg: "GPTConfig"):
        super().__init__()
        self.c_fc = nn.Linear(cfg.n_embd, 4 * cfg.n_embd, bias=cfg.bias)
        self.c_proj = nn.Linear(4 * cfg.n_embd, cfg.n_embd, bias=cfg.bias)
        self.dropout = nn.Dropout(cfg.dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.dropout(self.c_proj(gelu(self.c_fc(x))))


class Block(nn.Module):
    """One transformer block: pre-norm attention, then pre-norm MLP, each added
    back onto the residual stream (`x = x + sublayer(norm(x))`)."""

    def __init__(self, cfg: "GPTConfig"):
        super().__init__()
        self.ln_1 = LayerNorm(cfg.n_embd)
        self.attn = CausalSelfAttention(cfg)
        self.ln_2 = LayerNorm(cfg.n_embd)
        self.mlp = MLP(cfg)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x


@dataclass
class GPTConfig:
    block_size: int = 128   # maximum context length
    vocab_size: int = 65    # number of distinct characters
    n_layer: int = 4
    n_head: int = 4
    n_embd: int = 128
    dropout: float = 0.0
    bias: bool = True


class GPT(nn.Module):
    def __init__(self, cfg: GPTConfig):
        super().__init__()
        self.cfg = cfg

        self.wte = nn.Embedding(cfg.vocab_size, cfg.n_embd)   # token   embeddings
        self.wpe = nn.Embedding(cfg.block_size, cfg.n_embd)   # position embeddings
        self.drop = nn.Dropout(cfg.dropout)
        self.blocks = nn.ModuleList([Block(cfg) for _ in range(cfg.n_layer)])
        self.ln_f = LayerNorm(cfg.n_embd)
        self.lm_head = nn.Linear(cfg.n_embd, cfg.vocab_size, bias=False)

        # Weight tying: the matrix that maps ids -> vectors is reused (transposed)
        # to map vectors -> logits. Fewer parameters, and it trains better.
        self.wte.weight = self.lm_head.weight

        self.apply(self._init_weights)
        # GPT-2 trick: shrink the residual projections so deep stacks stay stable.
        for name, p in self.named_parameters():
            if name.endswith("c_proj.weight"):
                nn.init.normal_(p, mean=0.0, std=0.02 / math.sqrt(2 * cfg.n_layer))

    def _init_weights(self, module: nn.Module) -> None:
        if isinstance(module, nn.Linear):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(
        self, idx: torch.Tensor, targets: torch.Tensor | None = None
    ) -> tuple[torch.Tensor, torch.Tensor | None]:
        B, T = idx.shape
        assert T <= self.cfg.block_size

        pos = torch.arange(T, device=idx.device)
        x = self.drop(self.wte(idx) + self.wpe(pos))   # (B, T, C)
        for block in self.blocks:
            x = block(x)
        x = self.ln_f(x)
        logits = self.lm_head(x)                        # (B, T, vocab)

        loss = None
        if targets is not None:
            loss = F.cross_entropy(
                logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-1
            )
        return logits, loss

    @torch.no_grad()
    def generate(
        self,
        idx: torch.Tensor,
        max_new_tokens: int,
        temperature: float = 1.0,
        top_k: int | None = None,
    ) -> torch.Tensor:
        """Autoregressive sampling: predict the next token, append it, repeat."""
        for _ in range(max_new_tokens):
            idx_cond = idx[:, -self.cfg.block_size :]
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature
            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float("inf")
            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)
            idx = torch.cat((idx, idx_next), dim=1)
        return idx

    def config_dict(self) -> dict:
        return asdict(self.cfg)
