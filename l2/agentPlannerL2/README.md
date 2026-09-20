# agentPlannerL2

L2 planner. Reads a finished l4 module and every message in `pool/l2`, then
writes `l4/<mod>/pool/l2/web/menu.json` — menu v2.2: one tree of hubs, pages and
organisms (including `inbox`/`alerts`), filterable by actor, with `meta.processes`
and `meta.entities`, `device`, and `action` (`new|change|keep|remove`) stamped by
code against what is already a screen in l2 (today nothing is, so every node is
`new`).
One reasoning call. Lives in `mls-102020` next
to `agentChangeFrontend`. Unique name `agentPlannerL2`.

This phase is menu-only. `workspaces20`, `contracts30`, `shared40` and
`requests50` stay on disk, out of `flow.json`. The pool is not deleted. Nothing
is written to `pool/l1` or `l2/<mod>/web/`.

## Invocation

```
@@agentPlannerL2 <lowerCamel>
```

Or a step created by L4 whose prompt is JSON `{ moduleName, thread, file }`. Both
paths read the same `pool/l2` messages and write the same
`l2/<mod>/pipeline/pipeline.json`.

## Refusals (English, no LLM)

- missing / not lowerCamel module token
- module l4 `pipeline.json` missing or not `status: complete`
- empty `pool/l2` (or only `menu.json` / a device folder): `nothing pending for <mod> in pool/l2`
- two different requests in the box: `pool/l2 has N different requests; resolve with the l4 supervisor`

## Pipeline

`docs/flow.json` is the contract: `entry10 → menu20`. `entry10` is deterministic.
`menu20` spends one reasoning call and, on approve, sets `pipeline.status = complete`.
Re-execution always starts from zero (wipes the l2 pipeline and `web/` files),
overwrites `pool/l2/web/menu.json`, and leaves the pool intact. Empty `web/` folders stay:
`deleteFile` does not remove directories; `pipeline.webDir` records that.

Types reused from `/_102035_/l2/solution/{pool,fs,types}.js`. The l2 pipeline has
its own `flowId: agentPlannerL2` and carries `sourceMessages` of the grouped
request.
