# s3-indexts — CHANGELOG

- **2026-08-25 (E8a)** — Written. Deterministic (no LLM) migration of an existing `index.ts`'s
  `renderReferenceTable()` to a 3-line call into the new `shared/indexReferenceTable.ts`. Four decisions
  closed with the product owner before coding (D-E1 module location, D-E2/D-E2b color and column order,
  D-E3 cross-group columns, D-E4 title normalization) — see `flow.json`'s `decisions.s3Migration_*` at
  the agent root, and `spec.md`'s "E8" section for the full record, including two matcher bugs found and
  fixed while measuring D-E3 (7 of 30 groups looked "foreign" before the fixes, 1 after — a real,
  genuine cross-group reference, `groupEnterNumber`'s "Range Slider").
  Strong acceptance (todo §3): migrated the real `groupEnterDate` and `groupViewTable` `index.ts` files,
  diffed the result by hand (braces balanced, hero/cards/render() untouched), then compiled the migrated
  files against real, regenerated `index.defs.ts` content and the real shared module with a scoped `tsc`
  — clean, zero errors, confirming the `mls-102040` → `mls-102020` import resolves at the type level
  (D-E1's named risk). E8b (creating `index.ts` from scratch for the 2 groups with none) is not built —
  the todo explicitly allows stopping here.
