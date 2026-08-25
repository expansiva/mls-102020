# s2-project — CHANGELOG

- **2026-08-25** — Written. The group order was first guessed as "skills/index.ts order" (4 of 6 pilot
  groups fit), then re-guessed as "always skills/index.ts order" — both falsified by E5's regeneration
  (the seed lists `groupViewTable` before `groupEnterDate`, the opposite of their `skills/index.ts`
  order). Settled on alphabetical by folder: simple, deterministic, and every OTHER structural property
  of the seed reproduces exactly regardless of order. See `flow.json` → `decisions.groupOrder`.
