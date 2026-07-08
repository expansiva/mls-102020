# e5-behavior CHANGELOG

- 2026-07-07 — created (classification call + sequential workflow/operation item chain + e5-done
  anchor; schemas e5-classification/e5-workflow/e5-operation v1; gate with feature coverage,
  state/transition/operation cross-resolution, accessPattern keyField field-existence check and
  deterministic pageId/commandName/bffName recheck). pageId/commandName/bffName/capability/status
  fields are attached by code after each LLM call, never produced by the LLM.
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — promptWorkflow: story.steps requirement made explicit (2-6 sentences, never empty) after an empty-steps gate failure in the first cafeFlow run.
