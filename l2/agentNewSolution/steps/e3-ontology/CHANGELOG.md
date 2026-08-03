# e3-ontology CHANGELOG

- 2026-07-07 — created (plan call + sequential entity chain + e3-done anchor; schemas
  e3-model/e3-entity v1; gate with anti-usecase guard, relationship resolution, per-entity field
  checks). DesignContext deliberately NOT written to the ontology folder (backend reads every
  ontology file as a data entity).
- 2026-07-08 — fix: defs written with stor extension '.defs.ts' (was '.ts'; files were invisible to Stage 2/3, which filter extension === '.defs.ts').
- 2026-07-08 — fix: gate-failed run with a retry in flight is now completed-with-trace instead of 'failed' ('failed' marks the whole task failed and orphans the retry — msgtask1 evidence).
- 2026-07-08 — parallel fan-out (collab-messages parallel system, 5 slots) replaces the sequential entity chain; children complete-with-trace (never 'failed') and 'e3-finalize' verifies files on disk with one sequential repair round; interaction cleaner on completed runs; prompts: explicit initial state for confirm-then-handoff lifecycles, English enum values, event vs operational-state guidance; gate: 'field.enum.language' warning.
- 2026-08-03 — run 102046 died at "entities missing after repair round" with all 11 entities failing `field.enum.type` twice: the model uses `enum` as a semantic TAG on typed fields (`clientId/uuid → ["identifier"]`, `createdAt/datetime → ["timestamp"]`, `address/text → ["location"]`), so no entity file was ever written. `prepareE3EntityArtifact` now DROPS `enum` when the field type is not `string` — the same deterministic-repair class as `repairE6BffFroms`: a systematic model tic must not burn the run's repair rounds over a value the contract cannot express. The gate check stays for hand-written artifacts. `promptEntity.md` rewrote the enum line, which previously said "units and **categories** included" — an invitation to exactly this misreading.
