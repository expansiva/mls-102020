# e4-actors-rules CHANGELOG

- 2026-07-07 — created (single call: actor roster with deterministic roleScope, consolidated rule
  set absorbing E2 journey businessRules verbatim via sourceJourneyRules, external refs
  mdm/horizontals/plugins/agents for E7 approvedArtifacts; schema e4-actors-rules v1; gate with
  actor.missing / rule.appliesTo.unknown / rule.sourceRule.unknown errors and journeyRule.unmapped
  warning; e4-done anchor).
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — interaction cleaner ('input_output') on completed runs with artifacts on disk (DynamoDB 400KB).
