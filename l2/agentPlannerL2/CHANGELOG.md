# agentPlannerL2

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
