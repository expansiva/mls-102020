# E2 changelog

- 2026-08-05 — Aligned review callbacks with the stable orchestration: mutate an open agent parent,
  apply server intents and continue pooling, without local task-cache synchronization or widget locks.
- 2026-08-04 — Initial E2: permanent journey contracts, SHA-256 business hashes, context-flow gate,
  human review widget, adjustment loop, `/fast` approval and resumable pipeline state.
- 2026-08-05 — Added a guarded local smoke runner with dry-run, write and hash/business verification
  modes; exercised it against `mls-102046/l4/buildFlowFsm3`.
