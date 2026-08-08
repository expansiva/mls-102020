# E2 changelog

- 2026-08-08: Flow v16 makes `businessObject` a machine contract instead of localized display text.
  E2 normalizes human-spaced nouns to stable PascalCase ids before validation and persistence, and
  E4 therefore compares the same journey/ontology identifier. Run21 had every required ontology
  concept, but its overview repair could never equate `Project portfolio` with `ProjectPortfolio`.

- 2026-08-08: Flow v14 replaces full-draft semantic rewrites with mechanically merged journey and
  feature upserts. Coverage may converge through three bounded judge/patch cycles, while an unchanged
  blocker set fails early. The complete gate runs after every merge, and the judge receives only the
  E1 coverage subset instead of unrelated review metadata.

- 2026-08-08: Flow v13 makes the linear journey contract explicit: creation and maintenance with
  different context preconditions must be separate outcome journeys. Coverage-judge instructions no
  longer request an unrepresentable "update-only path"; repair feedback is a numbered checklist
  placed after the complete previous draft so the single bounded repair remains salient.

- 2026-08-07: E2 proposals now use an internal flexible payload, so an ungated journey candidate no
  longer flashes as a human clarification while structural repair or coverage judgment is pending.
  The journey list also sizes from all cards instead of overflowing beneath the review footer.

- 2026-08-07: Flow v8 separated deterministic structural repairs from semantic coverage repairs.
  A context-shape correction can no longer consume the judge's only completeness-repair budget;
  semantic repairs return through the gate and every repair/judge plan id remains unique.

- 2026-08-06: Flow v6 added an independent semantic coverage judge between the structural gate and
  human review. It checks the full E1 contract for missing actor/recipient journeys, uncovered
  outcomes and selectable references without named context acquisition or a credible lookup source.
  One complete-draft repair and one invalid-verdict retry are bounded; `/fast` cannot bypass the judge.

- 2026-08-05: Added one bounded automatic LLM repair after a deterministic gate failure; unknown
  step kinds are now preserved and rejected instead of silently becoming `locate`.

- 2026-08-05 — Added a live `collab-llm` integration runner. The first 102046 run exposed context
  handoff aliases that the old gate accepted; prerequisites now require contexts actually exported by
  the referenced journey, and `contextOrLookup` requires an explicit lookup fallback.
- 2026-08-05 — Build 6 preserves the original hook args in `prompt_ready`, fixing the run-6 409.
  E2 now starts disk state only after the LLM returns and persists terminal `error`/`failedAt`.
- 2026-08-05 — Aligned review callbacks with the stable orchestration: mutate an open agent parent,
  apply server intents and continue pooling, without local task-cache synchronization or widget locks.
- 2026-08-04 — Initial E2: permanent journey contracts, SHA-256 business hashes, context-flow gate,
  human review widget, adjustment loop, `/fast` approval and resumable pipeline state.
- 2026-08-05 — Added a guarded local smoke runner with dry-run, write and hash/business verification
  modes; exercised it against `mls-102046/l4/buildFlowFsm3`.
