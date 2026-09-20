# agentPlannerL2

## 2026-09-19 (p2_12)

- `menu.json` v2.1: `inbox`/`alerts`, `meta.processes` filled, candidates and gate for processes/derived.

## 2026-09-19 (p2_11)

- `menu.json` v2: one tree of hubs/pages/organisms, filterable by actor (`authorities`). Replaces v1.

## 2026-09-19 (p2_10)

- Last flow step (`menu20`) calls `markP2Complete` on approve: `pipeline.status = complete`
  when every `flow.json` step is approved.
- `entry10` records `webDir` after wiping `l2/<mod>/web/` files. Host/Studio have no
  `removeDir`; `deleteFile` unlinks files only, so empty folders stay and the pipeline
  line is `empty-left: deleteFile does not remove directories`.

## 2026-09-18 (p2_09)

- Flow v4: `entry10 → menu20`. Product is `l4/<mod>/pool/l2/menu.json`.
- `entry10` groups identical pool/l2 messages, records `sourceMessages`, wipes
  `l2/<mod>/pipeline/` and `l2/<mod>/web/`, never deletes the pool.
- `menu20`: one reasoning call; candidates from `workspaces20/contracts.ts` as
  data. Gate plus bounded repair. `workflows: []`.
- Parked (code stays): `workspaces20`, `contracts30`, `shared40`, `requests50`.

## 2026-09-18 (p2_05)

- `requests50`: one `pool/l1` message per BFF call. Body names the journey step, the
  contract Input/Output, and the cited l4 fields. Trace on the l2 pipeline, then
  delete the `pool/l2` message. No LLM. `docs/flow.json` is complete.

## 2026-09-18 (p2_04)

- `shared40`: one `web/shared/{workspaceId}.defs.ts` per workspace in the 102039
  20-key form. Code writes derived keys (`pageId`, `baseClassName`, `contractRef`,
  …); the model writes judgment (`scenaries`, `states`, `dataBindings`,
  `initialLoads`, `actions`, `destructiveCommandIds`, `pageName`). Gate plus
  bounded repair. No class, no page.

## 2026-09-18 (p2_03)

- `contracts30`: field catalog from `ontologyPaths`; call slots from the workspace cut
  (`locate` → paginated `qry*`, `inspect` → `qryGet*` / hub `ddm`, `act` → `cmd*` by effect,
  `decide` → one `cmd*` per branching origin). The model names calls and picks fields; the
  emitter writes `l2/<mod>/web/contracts/{workspaceId}.defs.ts` (interfaces + route constants).
- Gate: cited fields resolve; `derived: true` never in command Input except identity `id`;
  no `any`; no import. Repair by step (NS5 pattern).

## 2026-09-18 (p2_02)

- `workspaces20`: candidates grouped by `(entity, actorRef, kind)` from the l4 journeys.
  Journey with only `act` and no `locate` → `command`; `ddm` / inspect-only → `hub`; else
  `catalogue`. The model names the cut; the gate keeps every journey in exactly one workspace.
- Artifact `l2/<mod>/pipeline/workspaces20-draft.json`. Repair by step (NS5 pattern).

## 2026-09-18 (p2_01)

- Skeleton in the NS5 pattern: `createAgent` (`agentProject: 102020`, `visibility: public`),
  `helpers/p2Core.ts` + `p2Dispatch.ts`, `docs/flow.json` as the contract, one folder per step.
- `entry10` is deterministic: two entries (hand `@@agentPlannerL2 <lowerCamel>` and L4 step
  prompt `{ moduleName, thread, file }`) share `executeP2Entry`. Writes
  `l2/<mod>/pipeline/pipeline.json` with `thread` and `round`.
- Refusals in English, testable without an ExecutionContext: missing module, not lowerCamel,
  l4 not complete, `nothing pending for <mod> in pool/l2`.
- Steps `workspaces20`–`requests50` declared `waiting`. No LLM in this spec.
