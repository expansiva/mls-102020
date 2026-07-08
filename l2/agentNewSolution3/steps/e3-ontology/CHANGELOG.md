# e3-ontology CHANGELOG

- 2026-07-07 — created (plan call + sequential entity chain + e3-done anchor; schemas
  e3-model/e3-entity v1; gate with anti-usecase guard, relationship resolution, per-entity field
  checks). DesignContext deliberately NOT written to the ontology folder (backend reads every
  ontology file as a data entity).
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
