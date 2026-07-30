# n6-demo — CHANGELOG

## 2026-07-29 — created (control item 3.8)

Gate covers 12 codes with 14 tests, calibrated over the 146 real playground pages of mls-102040
(146/146 carry the state widget; 0 contain a document tag or `<script>`; 1 has a `<footer>`; tag uses
median 12, minimum 6, none below 6).

Decisions worth not undoing:

- **The gate runs BEFORE the state substitution.** Requiring `playgroundDinamicState` only means
  something at that moment — in the finished files the token is already replaced (0 of 146 contain it).
- **`tag_uses` is tied to the declared examples** (floor 6), not a flat 3 as in the Variant: it catches
  the real failure of declaring 6 scenarios and rendering 4 cards.
- **`state_binding`** rejects a `{{playground.<key>.…}}` binding no example declares. That binding
  renders empty on the page, and nothing else would notice.
- **`state_shape`** rejects a state name outside `playground.<key>.<property>`, because
  `substituteDemoState` drops those silently.
- **`<head[\s>]` not `<head`**: every real page opens with a `<header>`, so the loose form would reject
  all 146. Same class of bug as the `<!DOCTYPE|<html|<head|<body` regex that matched `<header` during
  the theme work — pinned by a test here.
- **No appearance rules on this artifact.** It is a page, not a component; the library's own pages use
  `bg-white dark:bg-slate-900`.
- **A persistent failure does not block the pipeline** — `n6-done` is emitted with `ok:false`.
