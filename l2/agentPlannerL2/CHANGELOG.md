# agentPlannerL2

## 2026-09-21 (p2_24)

- In `/candidate`, `menu20` receives the canonical menu as prompt data (ids,
  labels, wording). `effort40` reads `l4diff.json` plus that menu: a page whose
  needs cite an entity that declares a changed rule (or entity/transition) is
  `toUpdate`; same `pageId` with no citation is `done`; no canonical pair is
  `toCreate`; canonical page missing from the candidate is `toRemove`. Diff
  items that bind to no page go to `effort.json` `unattributed[]` and to
  `pipeline.warnings`. No free-text matching. Outside `/candidate` nothing
  changes.

## 2026-09-21 (p2_23)

- `entry10` honors `/candidate`. Hand invocation parses `@@agentPlannerL2 <mod>
  /candidate [<rel>]`; the L4 step prompt already carries `candidate`. Both call
  `applyP2CandidateRoot` (copied from L1, not imported) before any l4/pool/pipeline
  read. Empty or absent resets the canonical folder so a later task does not
  inherit. `..` is refused in English.
- Scratch wipe (`clearP2Scratch` / `isP2ScratchFolder` / `removeEmptyWebDir`) and
  `artifactPaths` derive the folder from `moduleFile(moduleName)`, the same root
  the writes already used. Without the flag the canonical tree is byte-identical.
- Whole-tree fingerprint helper `helpers/treeFingerprint.ts` is pure (`node:fs` /
  `node:path` only) so L1/L4 can copy it later. It stays in 102020.

## 2026-09-21 (p2_22)

- Flow v6: `entry10 → menu20 → needs30` (menu conversation) and
  `entry10 → effort40` (effort conversation). `entry10` partitions `pool/l2`
  by `from` before grouping; an l1 message with `backend.json` selects
  effort and does not wipe scratch. `effort40` writes `pool/l2/web/effort.json`
  and one `l2→l4` message, then closes the pipeline. `needs30` no longer
  closes it.

## 2026-09-21 (p2_21)

- Flow v5: `entry10 → menu20 → needs30`. `needs30` is deterministic: from the
  menu and the l4, writes `pool/l1/web/needs.json` (reads/writes per page,
  entity + operation) and one `l2→l1` message. Structural gate. Does not delete
  the pool. `menu20` no longer closes the pipeline.

## 2026-09-20 (p2_20)

- `meta.entities` and `P2_MENU_ENTITY_NO_FORM` are gone. Who maintains a
  `crud` record is in the grant description, not a gate.

## 2026-09-20 (p2_19)

- `action` compares with what is already built in l2, not with the previous
  `menu.json`. Today that manifesto does not exist: every node is `new`,
  `meta.removed` is `[]`. `diffMenuTrees`, the legacy migration and
  `pipeline.previousMenu` are gone.

## 2026-09-20 (p2_17)

- `P2_MENU_ENTITY_NO_FORM` trusts `meta.entities` (mapped, visible, has
  `form`/`actions`). It no longer searches organism prose.

## 2026-09-20 (p2_16)

- `menu20` candidates `recordsMaintained` + `meta.entities` + warning when a
  granted `writer: crud` record has no `form`/`actions` citing it.

## 2026-09-20 (p2_15)

- Menu path is `l4/<mod>/pool/l2/<device>/menu.json` (`device` enum, today `web`).
- Schema `2026-09-20-p2-menu-v2.2`: `device` on the file, `action` on every node,
  `meta.removed`. `action` is computed by L2 (`diffMenuTrees`), never by the model.
- One-shot migration: legacy `pool/l2/menu.json` is the previous of the first
  device run, then deleted. Pipeline records `device`, `previousMenu`, `actionCounts`.

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
