# e5-behavior CHANGELOG

- 2026-07-07 — created (classification call + sequential workflow/operation item chain + e5-done
  anchor; schemas e5-classification/e5-workflow/e5-operation v1; gate with feature coverage,
  state/transition/operation cross-resolution, accessPattern keyField field-existence check and
  deterministic pageId/commandName/bffName recheck). pageId/commandName/bffName/capability/status
  fields are attached by code after each LLM call, never produced by the LLM.
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — promptWorkflow: story.steps requirement made explicit (2-6 sentences, never empty) after an empty-steps gate failure in the first cafeFlow run.
- 2026-07-08 — parallel fan-out (5 slots) for workflows and operations with workflows→operations barrier ('e5-operations-phase'), disk-verified repair round in 'e5-finalize', and interaction cleaner on completed runs (DynamoDB 400KB).
- 2026-07-08 — gate: 'workflow.transition.self.initial' warning (self-transition in the initial state = missing pre-hand-off state in E3); promptWorkflow: first transition must leave the initial state.
- 2026-07-08 — contextResolution.originRef now REQUIRED (schema v2 + gate checks ported from v2 validateContextResolutionRef; catalog copied from runtimeConfigTypes). Root cause of the viewDashboard materialization failure in agentChangeBackend (no server-side resolution recipe -> handler required businessContext field from the request).
