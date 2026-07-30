<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/CHANGELOG.md" enhancement="_blank" -->

# CHANGELOG - steps/e2-journeys

## 2026-07-29 - gate-retry recovery contract (park + originStepId)

- Wagner's report + run04 evidence (todo/collabMessages/bugStatus.md): on gate failure the step went
  'failed' -> task flapped failed->in progress (error message on an in-progress task), and a
  SUCCESSFUL retry never completed the original step, so checkpoint-journeys (dependsOn
  ['e2-journeys'], a RUN planId — no e2-done anchor) stayed locked forever: task stuck 'in
  progress', user re-ran and paid the whole step again. flow.json conventions.gates (2026-07-08)
  already prescribed "never fail with a retry in flight" but the code had drifted.
- New contract: attempt-1 gate failure PARKS the original step as waiting_human_input (task
  untouched — no failure message, no flap, downstream stays locked over the pre-repair artifact);
  the retry step carries originStepId/originParentStepId and on success completes the parked step
  ('recovered by gate retry') unlocking the checkpoint, on exhaustion FAILS the parked step (task
  fails ONCE with the reason — message and status now consistent) and completes itself with trace.
  Crash/LLM-failed paths inside a retry run route the failure to the origin the same way
  (terminalFailureIntents; recoveryArgs hoisted so the catch can see them).
- Same treatment in steps/e1-draft (e2-journeys dependsOn ['e1-draft'] has the same gap). e6 keeps
  its complete-with-trace shape (its downstream is only added by the success path — no early
  unlock). flow.json conventions.gates updated with both sanctioned shapes.
- Engine-side items (premature failure broadcast, stale last_update_log, 'paused' semantics) stay
  in todo/collabMessages/bugStatus.md for a collab-messages session.

## 2026-07-29 - unreferenced soon/later self-heals (option C) + reasoningEffort marker

- run04 (mls-102045 clean run): grok classified richGanttScheduling as "later" with no journey step
  (semantically right — roadmap, not exclusion) and the gate burned an LLM retry round that merely
  moved it to decisions[]. `gate.ts` now does that deterministically: unreferenced soon/later
  features are removed from the catalog and parked as a featurePriority decision, with warning
  `unreferenced_feature_downgraded` (non-blocking). Unreferenced "now" stays an ERROR (core-loop
  hole); "never" stays exempt (28/jul). The mutated artifact is the gate output the caller persists.
- `prompt.md`: reference rule split by priority (now = hard, soon/later = reference or park as
  decision, never = exempt) and gained `<!-- reasoningEffort: high -->` (alias `reasoning` moved to
  glm-5.2; marker flows via getCommentsInPrompt -> callProxyLLM -> proxy reasoning.effort). Same
  marker added to e3-ontology/prompt.md and e4-actors-rules/prompt.md (whole-artifact calls only;
  promptEntity fan-out deliberately left at model default). Documented in skills/modelTypes.md.
- Known residual (documented in todo/collabMessages/bugStatus.md): a gate ERROR still queues the
  retry step whose success never completes the ORIGINAL failed step, so dependsOn ['e2-journeys']
  downstream stays locked — done-anchor/recovery fix pending.

## 2026-07-28 - never-priority features exempt from unreferenced_feature

- `gate.ts`: features with priority `never` no longer fail `unreferenced_feature` — they document
  explicit scope exclusions, so no journey exercises them by definition. The prompt told models to
  park E1 exclusions as `never` features while the gate demanded a journey reference for EVERY
  feature; grok-4.5 followed the prompt and hit the gate (mls-102045/buildFlowFsm run01, features
  advancedResourceLeveling/fullWarehouseInventory/deepClientSelfServicePortal), burning one retry
  round on every project whose E1 mentions exclusions.
- `prompt.md`: reference rule now scoped to now/soon/later and states the `never` exception.
- `gate.test.ts`: new case "accepts an unreferenced feature parked as never".
- Investigated but NOT changed: e3 prompt.md lacks the status/result/trace envelope block — the
  runtime already appends it via `buildNsToolInstruction` (agentNsOntology.ts), so the minimax
  missing-trace error (run01_bugllm2) was model drift, not a prompt gap.

## 2026-07-06 - T09 journey review widget

- Added `widgetNsJourneys.ts` and scoped `widgetNsJourneys.less`.
- Added `widgetNsJourneysLogic.ts` with pure helpers for edit application and the
  `checkpoint-journeys-answer` review payload.
- The widget renders actor lanes, journey list/detail, tabs for overview/business rules/notes,
  feature priority chips, version/history, prompt bar, and a change preview.
- User edits are registered in an immutable change log and emitted through `ns-journeys-change`.
  Approve/adjust emits `ns-journeys-review`; the widget still does not write artifacts directly.
- Added `agentNsJourneys.openStepView`, so the existing task feedback "open/abrir" action can mount
  the journey widget from persisted `e2-journeys.json` without changing the collab-messages UI.
- Changed `e2-journeys.md` from a full catalog copy to an audit summary/delta. The complete source of
  truth stays in `e2-journeys.json` and the widget.
- Verified the new files with filtered `tsc`; the repository-wide typecheck still fails in unrelated
  `mls-102032` files.

## 2026-07-06 - E2 content engine (T07/T08 + fixture)

- Added `schemas/e2-journeys.schema.json` (versioned `2026-07-06-ns-e2-v1`).
- Added `gate.ts`: prepare/validate/renderMarkdown for E2. Invariants: feature referential integrity
  (every step featureRef exists; every feature referenced by >=1 step), every actor has >=1 journey,
  journey actor must be declared, every E1 actor present unless an `actorRemoved` decision records it,
  unique ids (actors/journeys/steps/features/decisions), priorities in `now|soon|later|never`.
- Added `gate.test.ts` (node:test) covering the happy path and each invariant.
- Added `prompt.md` (modelType `reasoning`) and rewrote `readme.md`.
- Added fixture `fixture/cafeFlow/e2-journeys.{json,md}` (rich, pt-BR, 3 actors).
- Added `agentNsJourneys.ts`: reads only e1-draft.json (from disk, so it also works on a resumed
  task), builds the prompt, runs the tool call, gate + 1 retry, writes e2-journeys.{json,md} +
  pipeline + trace. On gate ok it marks the step completed (checkpoint-journeys widget deferred).
- Verified: `tsc` clean in mls-base (0 errors in mls-102020); the 6 gate invariants + fixture-passes-
  gate + markdown-render checked via a standalone TypeScript-transpile harness (the repo test runner
  could not run in this Linux sandbox due to a native esbuild binary mismatch).

Deferred (next round): checkpoint integration for `widgetNsJourneys`, the adjustment loop
`agentNsJourneysAdjustment`, versioning `e2-journeys.v{K}.json`, and the checkpoint-rendering fix
outside this folder (see flow.json checkpoint-journeys notes).

- 2026-07-18 — N5 (newSolution_10): the journeys checkpoint apply paths (`applyJourneysReview` + the [fast] auto-approve) now complete with cleaner `input_output` — same hygiene as the e1 clarification. The answer is persisted in the `checkpoint-journeys-answer` (or adjustment-request) result step, so the widget interaction payload is dropped from the task record.
