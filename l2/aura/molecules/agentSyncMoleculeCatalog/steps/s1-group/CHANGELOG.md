# s1-group — CHANGELOG

- **2026-08-25** — Written. Deterministic (no LLM). Format anchored on the 6 groups the
  `agentChooseMolecules` pilot seeded by hand (v2) — regenerating all 6 from their real source files and
  diffing against the seed came back structurally identical; see `spec.md` → "E5 acceptance" at the
  agent root. The scenario harvest (reading a group's CURRENT `index.ts` table on first sync) needed a
  token-set field matcher, not the simpler exact-camelCase match first tried: `groupViewTable`'s table
  uses abbreviated field names (`detailGrid`, `advanced`, plain `data`) that do not mechanically derive
  from a molecule's short name. See `flow.json` → `decisions.scenarioHarvest`.
