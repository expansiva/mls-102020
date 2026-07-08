# e6-journey-map CHANGELOG

- 2026-07-07 — created (single call + e6-done anchor; schema e6-journey-map v1; gate with
  workspace/operation/workflow/actor/entity resolution, operation coverage, landing checks and
  advisory-edge warnings; moduleName/note attached deterministically after the call).
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — interaction cleaner ('input_output') on completed runs with artifacts on disk (DynamoDB 400KB).
