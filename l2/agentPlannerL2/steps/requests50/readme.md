# requests50 — one `pool/l1` message per BFF call

Deterministic. No LLM.

## Input

- `l2/<mod>/pipeline/pipeline.json` (thread, round, messageFile from entry10)
- `l2/<mod>/pipeline/workspaces20-draft.json`
- `l2/<mod>/pipeline/contracts30-draft.json`
- The `pool/l2` message still on disk
- Module l4 journeys (to name `journeyId/stepId`)

## Output

One `l4/<mod>/pool/l1/<stamp>_<thread>_<round>.json` per contract call, then a `pool[]` trace on the **l2** pipeline (`processed` for the received message, `delivered` for each request), then the `pool/l2` message is deleted.

## Invariants

- `from: l2`, `to: l1`, `thread`/`round`/`mode` copied from the received message.
- `subject` is `<mod>.<ws>.<call>`. `artifacts` is `web/contracts/<ws>.defs.ts`.
- Body (English): the journey step that motivates the call, the Input/Output as they stand in the contract, the cited l4 entity/fields. No implementation suggestion.
- Order is write all → trace on `l2/<mod>/pipeline/pipeline.json` → delete. A failure anywhere leaves the `pool/l2` message in place.
- Gate: number of requests = number of calls; no orphan subject.
- Never writes `l4/<mod>/pipeline/`.
