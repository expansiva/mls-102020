# effort40 — final effort (screens + backend)

Deterministic. No LLM.

## Input

- `l4/<mod>/pool/l2/web/menu.json` (menu20)
- `l4/<mod>/pool/l2/web/backend.json` (L1 plan20)
- `l2/<mod>/pipeline/pipeline.json` (thread, round, messageFile of the l1 message)

## Output

`l4/<mod>/pool/l2/web/effort.json` (overwritten) and one `pool/l4` message
`subject: "effort of <mod> (web) ready"`, `artifacts: ["pool/l2/web/effort.json"]`.
Trace `delivered` on the l2 pipeline. The pool is not deleted. This step closes
the pipeline (`status: complete`) when every `flow.json` step is approved.

## Invariants

- Without `/candidate`, screen `status` is the menu `action` mapped
  `new→toCreate`, `change→toUpdate`, `remove→toRemove`, `keep→done`.
  `toRemove` screens come from `meta.removed[]`.
- In `/candidate`, screen `status` comes from the canonical menu + `l4diff.json`
  (needs × `entity.rules[]`). Unbound diff items are `unattributed[]`.
- Endpoints, usecases, tables and `removed[]` are copied from `backend.json`.
- Totals are recounted from the lists. Gate: every menu page appears, every
  endpoint has a known `usecaseRef`, totals match, enums. No judgment.
