# Prompt Injection, Visualized

Demo of [`ai-visualized`](../../README.md). A sandboxed, simulated support bot
you can attack — try known prompt-injection techniques, turn defenses on one
at a time, and see exactly which one stops each attack and why.

**Live:** <https://josemcortes.github.io/ai-visualized/prompt-injection/>

## There is no real model

Everything else in this repo wraps a real algorithm. This one doesn't call any
model — [`src/lib/engine.ts`](./src/lib/engine.ts) is a small, deterministic
rule table standing in for one. The same input and settings always produce the
same result, which is the point: it lets every verdict be explained exactly,
something a real model's fuzzier behaviour wouldn't allow. It shows the
_shape_ of these attacks and defenses, not a certified test of them.

## What it shows

- **The anatomy of a prompt** — a system prompt, optionally a "retrieved
  document," and the user's message, concatenated into one block of text. The
  model can't tell which part is which; that's the whole vulnerability.
- **Six attack patterns**: direct override, a role-play jailbreak, a forged
  system tag, indirect injection (the payload lives in a document, not the
  user's message), an obfuscated (base64) payload, and prompt leaking.
- **Five defenses**, off by default: marking untrusted content, an instruction
  hierarchy, an input keyword filter, an output filter, and keeping the secret
  out of the model's context entirely. Toggle them and re-send — the verdict
  names exactly which one caught it (or which ones would).

## How it's built

`STOPPED_BY` in [`src/lib/attacks.ts`](./src/lib/attacks.ts) is a plain table:
for each attack category, which single defenses are enough to stop it. That
table _is_ the security reasoning — e.g. an obfuscated payload is only caught
by the output filter or removing the secret, never by a plaintext keyword
filter, which is the whole lesson of that example. 46 tests check every
attack against every defense, individually.

## Run

```bash
npm install                 # from the repo root
npm run dev:prompt-injection
npm test --workspace @ai-visualized/prompt-injection
```
