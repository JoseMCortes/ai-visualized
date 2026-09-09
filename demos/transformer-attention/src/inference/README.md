# inference/

The trained GPT, re-implemented from scratch in TypeScript so it runs in the
browser with no ML library. A `tsc`-checked, dependency-free port of
[`training/model.py`](../../../../training/model.py).

## How one forward pass works

Input: a list of character ids, `ids[0..T-1]` (T ≤ 128).

### 1. Embeddings

Each id is looked up in a table (`wte`) to get a 128-number vector. A second
table (`wpe`) adds a vector that depends only on the **position** 0, 1, 2, …
The result is the _residual stream_: one vector per position that every later
step reads from and writes back to.

```
x[t] = wte[ids[t]] + wpe[t]
```

### 2. Four transformer blocks

Each block updates the stream twice, each time normalising first and **adding**
the result back (never replacing it):

```
x = x + attention( layerNorm(x) )
x = x + mlp(       layerNorm(x) )
```

**Causal self-attention** is where positions talk to each other. For each head
(there are 4), every position produces a _query_, a _key_ and a _value_ vector
(32 numbers each). The attention weight from position `i` to position `j` is

```
softmax_j (  q_i · k_j / sqrt(32)  )   for j ≤ i     (j > i is masked out)
```

so position `i` can only look backwards. Position `i`'s output is that
weighted average of the value vectors. Those weights — one `T×T` matrix per
head per layer — are exactly what the visualiser draws.

**The MLP** is applied to each position independently: expand 128 → 512,
apply GELU, project 512 → 128. It has no view across positions; it just
transforms whatever attention gathered.

### 3. Unembed

A final `layerNorm`, then a dot product of each position's vector against
every row of the token table (`wte`, reused here — "weight tying") gives a
**logit** for every possible next character. `softmax` turns the last
position's logits into the probability bars; sampling picks the next
character; append it and repeat.

## Files

| file              | role                                                                 |
| ----------------- | -------------------------------------------------------------------- |
| `linalg.ts`       | `linear`, `layerNorm`, `geluTanh`, `softmax` — the only maths needed |
| `model.ts`        | `GPTModel.forward()` (returns attention + logits) and `generate()`   |
| `sampling.ts`     | temperature / top-k / top-p sampling + a seedable RNG                |
| `loadModel.ts`    | parse `model.bin` (int8 → float32) into a `GPTModel`                 |
| `forward.test.ts` | **parity test** vs. `reference.fixture.json` from PyTorch            |

## Parity

`forward.test.ts` loads the same `model.bin` the browser uses, runs this
forward pass on a fixed prompt, and checks it against the PyTorch reference in
`reference.fixture.json`. Current agreement: attention weights to ~1e-6, logits
to ~1e-5 — the only difference is float32 (PyTorch) vs float64 (JavaScript)
accumulation.
