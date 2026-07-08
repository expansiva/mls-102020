# E6 — Journey map (agentNs3JourneyMap)

Single-call step (`planId: e6-journey-map`, no item chain) that consolidates the frozen E5
behaviors into the module navigation map:

- **workspaces** — the page-grouping unit read by agentChangeFrontend (one page per workspace):
  `workspaceId/title/actor/kind/entity/workflowId/operationIds/purpose`. `kind` maps to the
  consumer `sourceKind` (`workflow` | `operation`); workflow workspaces host the workflow's
  operations, standalone mdm/management operations group into management workspaces per entity.
- **landings** — the first workspace each actor opens (`actorId/workspaceId/reason?`).
- **navigationEdges** — advisory handoffs between workspaces (`from/to/operationId?/description?`);
  Stage 2 only emits warnings from them.

Inputs (disk only): `pipeline/e2-journeys.json`, `pipeline/e5-classification.json`,
`pipeline/e4-actors-rules.json` (roster), `pipeline/e3-model.json` (entity ids) and short summaries
of the saved `l4/workflows/{id}.ts` / `l4/operations/{id}.ts` defs. `moduleName` and the fixed
`note` are attached deterministically after the call — never by the LLM.

Gate (`gate.ts`): schema + unique workspaceIds; operationIds/workflowId resolve against the E5
classification (`workflowId` required when kind is `workflow`); actor resolves against the E4
roster and entity against the E3 model; every classified operation appears in >= 1 workspace;
landings resolve; warnings for now-priority actors without a landing and for edges referencing
undeclared workspaces. 1 retry with the gate error in context.

On a green gate: writes `l4/{module}/journeys/{module}Journeys.defs.ts` (export
`{module}Journeys`, data `{moduleName, note, workspaces, landings, navigationEdges}`) +
`pipeline/e6-journey-map.md`, approves the pipeline step (`auto`) and emits the completed
`e6-done` anchor that unlocks E7.
