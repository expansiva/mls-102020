# CHANGELOG — i6-index

## 2026-08-06 — first version

- **flow.json said "deterministic, no LLM" and that was wrong.** Corrected here and in the spec.
  The import is derivable; the showcase card is hand-written Lit with chosen sample data and is
  not. Leaving the claim in place would have produced a step that reports "index updated" after
  fixing only an import — the 2026-08-05 failure wearing a different hat.
- Three exits instead of one: no-op, import-only (deterministic, no model), card work (model).
- **The import is written BEFORE the model is called**, so the page it reads is the page it edits
  and it never has to reason about imports. It also survives a failed attempt, being derivable and
  correct on its own.
- `playgroundChanged` is read from i5's artifact, never recomputed — see the readme.
- Added a `shrunk` check (>10% smaller): the plausible catastrophic failure here is the model
  "tidying" a 782-line page it was asked to extend by four lines.
- Imports are counted by PATH, with or without a `.js` extension: the library writes them without,
  a hand-edited index could carry one, and both are the same import.
