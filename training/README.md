# training/

Trains the tiny character-level GPT that the [self-attention
demo](../demos/transformer-attention/) runs in the browser, and exports it to a
format the browser can load.

Nothing here runs in CI or ships to users — it produced the weights in
`demos/transformer-attention/public/model/`, which are committed. You only need
this if you want to retrain or change the model.

## Run it

```bash
pip install -r requirements.txt      # torch + numpy
python prepare_data.py               # download corpus -> data/
python train.py                      # ~a few minutes -> out/ckpt.pt
python export.py                     # -> browser files + test fixture
```

## The model, in one paragraph

A token is a single character. Each character id is looked up in an embedding
table to get a vector, and a second table adds a vector for its **position**.
That stream of vectors passes through 4 **transformer blocks**. Each block does
two things and adds each result back onto the stream: (1) **causal
self-attention** — every position mixes in information from earlier positions,
weighted by how relevant they are; (2) a small **MLP** applied to each position
on its own. A final normalization and a projection back to vocabulary size give
a score (logit) for every possible next character. Softmax turns those into
probabilities.

"Causal" = position _t_ may only look at positions ≤ _t_, so a single forward
pass gives a next-character prediction at _every_ position, and all of them can
be trained at once.

## Configuration

|                        | value   | why                                                                      |
| ---------------------- | ------- | ------------------------------------------------------------------------ |
| context (`block_size`) | 128     | long enough to show attention reaching across a line of dialogue         |
| layers                 | 4       | deep enough for interesting multi-step attention, shallow enough to read |
| heads                  | 4       | each head can specialise (previous-token, line-start, quote-matching, …) |
| embedding dim          | 128     | ~0.8M params total                                                       |
| quantized size         | ~0.8 MB | int8 weights, dequantized on load in the browser                         |

Trained on [tiny-shakespeare](https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt)
(~1 MB of text) with AdamW, cosine-decayed learning rate, for 4000 steps.

## Files

| file              | role                                                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| `model.py`        | the GPT definition — kept close to the maths so the TS port mirrors it                                               |
| `prepare_data.py` | download corpus, build the char↔id maps, write `train.bin` / `val.bin`                                               |
| `train.py`        | the training loop; saves the best-val-loss checkpoint                                                                |
| `export.py`       | quantize to int8, write `config.json` / `vocab.json` / `model.bin`, and a reference forward pass for the parity test |

## Parity test

`export.py` also writes `reference.fixture.json` next to the TypeScript
inference code: one fixed prompt, the resulting per-layer attention weights, and
the output logits, computed from the **dequantized** weights. The TS test loads
the same `model.bin`, runs its own forward pass, and asserts it matches — so the
browser implementation can't silently drift from the trained model.
