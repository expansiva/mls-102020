# Changelog

## 2026-08-26 — reviewPolicy smart

- `smart` still opens E6: the composition review has no A/B/C signal. `/fast` and `automatic` still skip.

## 2026-08-26 — reviewPolicy automatic

- After a valid composition gate, E6 auto-approves when `/fast` is set **or** the E1 module has
  `reviewPolicy.mode=automatic`. Shared helper: `helpers/ns4ReviewPolicy.ts`.

## 2026-08-09

- Added the sixth clarification for conservative horizontal-module and plugin analysis.
- Added one typed permanent composition artifact; empty recommendations are valid.
- Kept the existing `e6-behaviors` runtime plan id as the stable internal identifier.
