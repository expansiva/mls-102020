# agentPlannerL2

L2 planner. Reads a finished l4 module and every message in `pool/l2`, then
writes `l4/<mod>/pool/l2/web/menu.json` — menu v2.2: one tree of hubs, pages and
organisms (including `inbox`/`alerts`), filterable by actor, with `meta.processes`,
`device`, and `action` (`new|change|keep|remove`) stamped by
code against what is already a screen in l2 (today nothing is, so every node is
`new`). After the menu, `needs30` derives `l4/<mod>/pool/l1/web/needs.json`
(what each page reads and writes, entity + operation) and one `l2→l1` message.
When `pool/l2` has the L1 `backend.json`, `effort40` joins screens and backend
statuses into `l4/<mod>/pool/l2/web/effort.json` and one `l2→l4` message.
One reasoning call (menu). Lives in `mls-102020` next
to `agentChangeFrontend`. Unique name `agentPlannerL2`.

`workspaces20`, `contracts30`, `shared40` and `requests50` stay on disk, out of
`flow.json`. The pool is not deleted. Nothing is written to `l2/<mod>/web/`.

## Invocation

```
@@agentPlannerL2 <lowerCamel>
@@agentPlannerL2 <lowerCamel> /candidate
@@agentPlannerL2 <lowerCamel> /candidate pipeline/changes/<id>/revisions/<rev>/l4
```

Or a step created by L4 whose prompt is JSON `{ moduleName, thread, file, candidate }`.
`candidate` is optional; L4 writes the resolved folder when it dispatched with
`/candidate`. Both paths read the same `pool/l2` messages and write the same
pipeline (`l2/<mod>/pipeline/pipeline.json`, or under the `/candidate` root).

- `/candidate` alone points `moduleFolder` at `<mod>/tobe/plan`. A relative path
  is joined under the module. Without the flag the canonical tree is byte-identical.
- Writes (l2 pipeline, `pool/l2`) and the scratch wipe follow `moduleFile`, so they
  land inside the candidate when the flag is set. Canonical `l2/<mod>/pipeline` and
  `l2/<mod>/web` are never listed or deleted.

## Refusals (English, no LLM)

- missing / not lowerCamel module token
- `/candidate` path containing `..`
- module l4 `pipeline.json` missing or not `status: complete`
- empty `pool/l2` (or only `menu.json` / a device folder): `nothing pending for <mod> in pool/l2`
- two different requests in the box: `pool/l2 has N different requests; resolve with the l4 supervisor`

## Pipeline

`docs/flow.json` is the contract: menu conversation `entry10 → menu20 → needs30`,
effort conversation `entry10 → effort40`. `entry10`, `needs30` and `effort40`
are deterministic. `menu20` spends one reasoning call. `effort40`, on approve,
sets `pipeline.status = complete` when every flow step is approved. The menu
conversation wipes the l2 pipeline and `web/` files of the **active root**; the
effort conversation does not. Both overwrite their artefact and leave the pool messages intact.
Empty `web/` folders stay: `deleteFile` does not remove directories;
`pipeline.webDir` records that.

Types reused from `/_102035_/l2/solution/{pool,fs,types}.js`. The l2 pipeline has
its own `flowId: agentPlannerL2` and carries `sourceMessages` of the grouped
request.
