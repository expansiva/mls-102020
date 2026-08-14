# E2 changelog

- 2026-08-14: The declared context graph is gone. A step is now
  `{stepId, kind, entity, title, description, featureRefs}` plus `targetProfile` on a handoff;
  `requiresContext`, `providesContext`, `entry.carries` and `prerequisites` no longer exist and the
  gate lost every context check. Contexts are derived by `helpers/ns4Context.ts` from the entity, the
  step kind, the journey order and the approved ontology. Journey schema v5, index v6, review schema
  `2026-08-14-v5`; artifacts of previous flow versions stay compile-only through
  `Ns4LegacyJourneyArtifact` and are never migrated.

- 2026-08-13: Added the evidence-backed whole-module `moduleWithoutDecide` coverage signal. Code
  records the complete step-kind histogram, sends S1 plus the original request to the existing judge,
  reuses the single semantic repair, and turns a surviving choice into a visible journey
  `policyDecision`. A failed decision-coverage judgment records a system decision and continues.

- 2026-08-12: Restored the documented `/fast` behavior after the coverage judge: E2 persists the
  gated draft and its generated policy choices as an automatic approval instead of unconditionally
  opening the journey clarification. The judge and both repair budgets remain unchanged.

- 2026-08-10: Flow v21 makes policy choices first-class E2 contracts. Generation declares a
  journey's choices without impact; the independent judge adds impact/related-journey context; the
  widget sends structured selections. Any alternative selection triggers a complete versioned rewrite
  and the deterministic honor gate requires the rewritten `chosen` value to match it. Approval
  records every selection in the journey index and writes an E2 impact report that reopens affected
  downstream journey-derived checkpoints.

- 2026-08-08: Flow v17 unifies the meaning of optional and required journey context across E2 and
  E4. A `contextOrLookup` fallback now locates only required carried contexts; optional handoffs do
  not become unconditional `requiresContext` inputs or mandatory ontology entities. The same shared
  selector drives both gates. Run22 exposed the old contradiction after a valid coverage repair
  introduced an optional `taskRiskAssessment` handoff.

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
- 2026-08-12: Flow v29 limits semantic repair to one round, adds judge question/alternatives/defaultChoice,
  persists remaining coverage bifurcations as system decisions, and always opens the E2 review widget.
