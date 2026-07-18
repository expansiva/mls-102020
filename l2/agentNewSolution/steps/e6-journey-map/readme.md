# E6 — Journey map (agentNsJourneyMap)

Single-call step (`planId: e6-journey-map`, no item chain) that consolidates the frozen E5
behaviors into the module navigation map:

- **workspaces** — the page-grouping unit (one page per workspace):
  `workspaceId/title/actor/kind/entity/workflowId/purpose` + **`sections`** (the page composition).
  Each section has `sectionId/intent/organisms`; each organism is `{operationId, role, attachTo?}`
  where role ∈ `primarySurface | filterControl | contextualAction | detailPanel | batchAction |
  navigationEntry`. The LLM CLASSIFIES operations into roles; it does not design structure.
  `operationIds` is DERIVED from the organisms (code, source of truth = sections) and kept for the
  agentChangeFrontend consumer and the e7 coverage/capability checks. workflow workspaces host the
  workflow's operations; standalone mdm/management operations group into management workspaces per
  entity (browse = primarySurface, search/filter = filterControl attachTo the browse).
- **landings** — the first workspace each actor opens (`actorId/workspaceId/reason?`).
- **navigationEdges** — advisory handoffs between workspaces (`from/to/operationId?/description?`);
  Stage 2 only emits warnings from them.

Inputs (disk only): `pipeline/e2-journeys.json`, `pipeline/e5-classification.json`,
`pipeline/e4-actors-rules.json` (roster), `pipeline/e3-model.json` (entity ids) and short summaries
of the saved `l4/{module}/workflows/{id}.ts` / `l4/{module}/operations/{id}.ts` defs. `moduleName` and the fixed
`note` are attached deterministically after the call — never by the LLM.

Gate (`gate.ts`): schema + unique workspaceIds; organism operationIds/workflowId resolve against
the E5 classification (`workflowId` required when kind is `workflow`); actor resolves against the E4
roster and entity against the E3 model. Composition invariants (D4): every classified operation is
covered by EXACTLY ONE organism; exactly 1 `primarySurface` per section; `filterControl` requires
`attachTo` pointing at a primarySurface in the same section; `detailPanel` only for `getById`
operations; `batchAction` only for commands over a multiple selection (or with no public input) —
the last two checked against per-operation facts passed into the gate context (accessPattern/kind/
selection/public-input, read from the frozen operation defs; the gate stays disk-free). Landings
resolve; warnings for now-priority actors without a landing and for edges referencing undeclared
workspaces. 1 retry with the gate error in context.

The filterControl input-vs-target-operation check (D4) is structural for now (attachTo → surface);
the field-level input match arrives with the D3 contracts step (T7).

On a green gate: writes `l4/{module}/journeys/{module}Journeys.defs.ts` (export
`{module}Journeys`, data `{moduleName, note, workspaces, landings, navigationEdges}`) +
`pipeline/e6-journey-map.md`, approves the pipeline step (`auto`) and emits the completed
`e6-done` anchor that unlocks E7.

## Workspace kind derivation (2026-07-11)

`kind` is canonical (`workflow | operation | entityManagement`) and DERIVED deterministically from
the classification after the LLM call (`deriveE6WorkspaceKinds`, before `repairE6WorkflowIds`):
workspaces with workflow-owned operations are `workflow`; all-standalone create+update on the
workspace entity is `entityManagement` (list-first CRUD pages downstream — tabular_classic);
anything else is `operation`. The LLM label is not trusted: the 102051 run labeled entity CRUDs as
"workflow", which rejected the CRUD template in Stage 2 by construction. `entityManagement`
workspaces never carry a workflowId (gate error).
