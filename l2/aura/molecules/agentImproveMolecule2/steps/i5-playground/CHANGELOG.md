# CHANGELOG — i5-playground

## 2026-08-06 — first version

- **The staleness decision is deterministic and the model is skipped entirely when it says no.**
  flow.json asked for "a no-op that says so"; making it a no-*call* rather than a no-op answer is
  what keeps the common improve run (a colour, a spacing) at zero LLM cost for this step.
- `surface.ts` moved from `steps/i2-triage/` to `helpers/imSurface.ts` when this step became its
  second consumer — agentsBestPractices §2 makes `helpers/` mandatory at exactly that point. Added
  `diffSurface` there rather than here for the same reason.
- `slotIsExercised` also moved to `helpers/`, after i6-index needed it. Deliberate: i5 asks it of
  the playground and i6 of the group index, and **the two must agree**. 2026-08-05 was the
  playground being fixed and the index left behind; two subtly different readings of "exercised" is
  how that recurs.
- Reuses `applyEdits` from i3 instead of regenerating the page like `n6-demo` does. n6-demo is
  creating a page; here someone wrote the examples and a developer relies on them.
- Nothing is written before the gate passes, so no rollback is needed — unlike i3, which must
  compile the file to judge it and therefore has to write first.
