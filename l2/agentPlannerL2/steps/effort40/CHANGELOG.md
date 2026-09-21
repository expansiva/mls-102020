# effort40

## 2026-09-21 (p2_24)

- `/candidate`: screen status comes from the canonical menu + `l4diff.json`,
  not from menu `action`. Attribution is `rule:X` → `entity.rules[]` contains
  X → pages whose needs read/write those entities. Orphan diff items are
  `unattributed[]` (`changeId`, `kind`, `op`, `reason`) and a pipeline
  warning. Schema `p2-effort-v1.1`.

## 2026-09-21 (p2_22)

- First cut. Deterministic `pool/l2/web/effort.json` from the menu (screen
  `action` mapped to the l1/CB status vocabulary) and `backend.json` (copied
  statuses). Totals recounted. Structural gate. One `l2→l4` message. No LLM.
- `inProgress` is not a status here. Statuses are declared locally; this step
  does not import `OwnerStatus` from mls-102021.
