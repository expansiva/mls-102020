# s1-group — CHANGELOG

- **2026-08-25** — Written. Deterministic (no LLM). Format anchored on the 6 groups the
  `agentChooseMolecules` pilot seeded by hand (v2) — regenerating all 6 from their real source files and
  diffing against the seed came back structurally identical; see `spec.md` → "E5 acceptance" at the
  agent root. The scenario harvest (reading a group's CURRENT `index.ts` table on first sync) needed a
  token-set field matcher, not the simpler exact-camelCase match first tried: `groupViewTable`'s table
  uses abbreviated field names (`detailGrid`, `advanced`, plain `data`) that do not mechanically derive
  from a molecule's short name. See `flow.json` → `decisions.scenarioHarvest`.

- **2026-08-25 (E8 prep)** — Two matcher bugs found and fixed while running the D-E3 sweep
  (`todo-implementar-E8-index-ts.md` §2) across all 30 real groups with an `index.ts` (the pilot's 6
  seeded groups never exercised them): (1) some groups keep the `ml` prefix in the field name
  (`mlDateIntervalDrag`), most drop it (`addressField`) — the field side now drops a leading `ml` token;
  (2) a letter→digit boundary was not tokenized (`scanCode1d` read as one merged token `code1d` instead
  of `code`+`1d`), and a compound word spelled as ONE word in the filename but split by camelCase in the
  field (`mindMap` vs `ml-view-hierarchy-mindmap`'s `mindmap`) matched neither exactly nor as a superset —
  added a third, unique-substring fallback tier for exactly that case. Before the fixes, the sweep found 7
  of 30 groups with fields that looked "foreign"; after, only 1 (`groupEnterNumber`'s `rangeSlider`,
  genuinely `ml-number-range-slider` from `groupEnterNumberInterval`) — this is the number D-E3 uses.
  Re-verified: all helper tests green, E5's 6-group regeneration still structurally identical.
