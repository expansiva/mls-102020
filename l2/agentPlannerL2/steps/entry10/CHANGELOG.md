# entry10

## 2026-09-21 (p2_22)

- Partitions `pool/l2` by `message.from` before grouping. An `l1` message whose
  artifacts contain `backend.json` is the effort conversation: no scratch wipe,
  existing `pipeline.json` is kept, `menu.json` is required. The menu
  conversation is unchanged. The different-requests refusal still applies
  inside the chosen partition.

## 2026-09-19 (p2_10)

- After wiping files under `l2/<mod>/web/`, records `pipeline.webDir`. No host/Studio
  `removeDir`; leftover empty folders are `empty-left: deleteFile does not remove directories`.

## 2026-09-18 (p2_09)

- Reads every `pool/l2` message (oldest first). Same `moduleName`+`mode`+`artifacts` is one
  request (`sourceMessages`). Two different requests refuse. `menu.json` is not a message.
- Always restarts: wipes `l2/<mod>/pipeline/` and `l2/<mod>/web/`. Never deletes the pool.

## 2026-09-18 (p2_01)

- Deterministic gate: parse, read `pool/l2`, refuse, write the l2 `pipeline.json`.
- Hand invocation loads the oldest message and puts `{ moduleName, thread, file }` on every
  planned step so the L4 dispatch prompt and the hand path share `executeP2Entry({ kind: 'step' })`.
- No `prompt.md`: this step does not call a model.
