<!-- mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/CHANGELOG.md" enhancement="_blank" -->

# CHANGELOG - steps/e2-journeys

## 2026-07-06 - E2 content engine (T07/T08 + fixture)

- Added `schemas/e2-journeys.schema.json` (versioned `2026-07-06-ns3-e2-v1`).
- Added `gate.ts`: prepare/validate/renderMarkdown for E2. Invariants: feature referential integrity
  (every step featureRef exists; every feature referenced by >=1 step), every actor has >=1 journey,
  journey actor must be declared, every E1 actor present unless an `actorRemoved` decision records it,
  unique ids (actors/journeys/steps/features/decisions), priorities in `now|soon|later|never`.
- Added `gate.test.ts` (node:test) covering the happy path and each invariant.
- Added `prompt.md` (modelType `codereasoning`) and rewrote `readme.md`.
- Added fixture `fixture/cafeFlow/e2-journeys.{json,md}` (rich, pt-BR, 3 actors).
- Added `agentNs3Journeys.ts`: reads only e1-draft.json (from disk, so it also works on a resumed
  task), builds the prompt, runs the tool call, gate + 1 retry, writes e2-journeys.{json,md} +
  pipeline + trace. On gate ok it marks the step completed (checkpoint-journeys widget deferred).
- Verified: `tsc` clean in mls-base (0 errors in mls-102020); the 6 gate invariants + fixture-passes-
  gate + markdown-render checked via a standalone TypeScript-transpile harness (the repo test runner
  could not run in this Linux sandbox due to a native esbuild binary mismatch).

Deferred (next round): graphical widget `widgetNs3Journeys`, the adjustment loop
`agentNs3JourneysAdjustment`, versioning `e2-journeys.v{K}.json`, and the checkpoint-rendering fix
(see flow.json checkpoint-journeys notes).
