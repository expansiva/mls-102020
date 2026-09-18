# entry10

## 2026-09-18 (p2_01)

- Deterministic gate: parse, read `pool/l2`, refuse, write the l2 `pipeline.json`.
- Hand invocation loads the oldest message and puts `{ moduleName, thread, file }` on every
  planned step so the L4 dispatch prompt and the hand path share `executeP2Entry({ kind: 'step' })`.
- No `prompt.md`: this step does not call a model.
