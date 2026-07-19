<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/CHANGELOG.md" enhancement="_blank" -->

# CHANGELOG - steps/e2-journeys

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
- Added `prompt.md` (modelType `codereasoning`) and rewrote `readme.md`.
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
