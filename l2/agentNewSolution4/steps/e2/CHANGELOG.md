# E2 changelog

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
