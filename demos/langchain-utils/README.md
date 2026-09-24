# LangChain Utils, Live

Demo of [`ai-visualized`](../../README.md). Every other demo in this repo
reimplements an algorithm from scratch — there's no honest from-scratch
version of LangChain, since its entire job is gluing together calls to a
_real_ model. So instead of faking it, this one runs the actual
[`@langchain/core`](https://www.npmjs.com/package/@langchain/core) library,
in your browser, against a real OpenAI or Anthropic key that you provide.

**Live:** <https://josemcortes.github.io/ai-visualized/langchain-utils/>

## What you can do

- Pick a review, or write your own.
- Watch the **prompt template** fill in live — no key needed, it's pure
  string substitution.
- Paste your own OpenAI or Anthropic key (stored only in `localStorage`,
  sent only to that provider) and press **Run chain** to make a real call:
  the model's raw text response, then the same text parsed into a typed
  `{ sentiment, summary, topics }` object by a `zod`-schema output parser.
- Switch providers to see the one line of LCEL that actually changes.

## How it's built

`src/lib/prompt.ts` builds a real `ChatPromptTemplate` and a real
`StructuredOutputParser` from a `zod` schema — both are pure (no network),
so they're unit tested directly. `src/lib/models.ts` builds `ChatOpenAI` or
`ChatAnthropic` with `dangerouslyAllowBrowser: true` (both SDKs refuse to
run client-side otherwise, for good reason — see the in-page disclaimer).
The UI calls the three LCEL stages — template, model, parser — one at a
time instead of through a single `.pipe()` chain, purely so every
intermediate value stays visible on screen; `src/lib/codeSnippet.ts` shows
the idiomatic one-line version next to it. 15 unit tests cover the
pure/testable half of the pipeline; the network-calling half is
necessarily untested (verified manually against both providers' real APIs
instead — including real 401/503 error paths).

## Run

```bash
npm install                 # from the repo root
npm run dev:langchain-utils
npm test --workspace @ai-visualized/langchain-utils
```

## Caveat

`dangerouslyAllowBrowser` is not a suggestion — calling a provider directly
from client-side code ships your API key to every visitor's browser. That's
fine here, since the key is _yours_, typed into _your own_ browser, for
_your own_ use. A real product should proxy these calls through a server so
the key never reaches a browser at all.
