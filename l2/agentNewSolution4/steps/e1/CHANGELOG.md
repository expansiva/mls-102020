# E1 changelog

- 2026-08-05 — Separated widget `userLanguage` from editable product languages; explicit multilingual
  prompts now produce a normalized, ordered `module.languages` list instead of losing all but one.
- 2026-08-04 — Prevent duplicate interactive clarification submits from saving E1 once and then
  failing the same step with a false module-collision error.
- 2026-08-04 — Initial E1: clarification, real `/fast`, permanent partial `module.defs.ts`, resumable
  pipeline and foreign-module collision guard.
