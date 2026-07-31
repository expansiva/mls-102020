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

On a green gate (D1 split layout): writes one file per workspace
`l4/{module}/workspaces/{workspaceId}.defs.ts` (export `{workspaceId}Workspace`) + a single
`l4/{module}/navigation.defs.ts` (export `{module}Navigation`, data
`{moduleName, note, landings, navigationEdges, workspaceIds}` — the workspaceIds index lets readers
reassemble without scanning the folder) + `pipeline/e6-journey-map.md`, approves the pipeline step
(`auto`) and emits the completed
`e6-done` anchor that unlocks E7.

## Presentation: page category + style (2026-07-31, improveNewSolution T1–T3)

Each workspace detail also carries `presentation: { categoryRef, styleRef?, confidence, alternates?,
experienceRef?, classificationNote? }` — the INTERACTION SHAPE of the page, which lets the l2
renderer resolve `_102040_/l4/templates/<styleRef>/<categoryRef>/template.md`. It classifies the FORM
of the contract; it never changes the use case, the rules or the entities.

- **Single source of truth**: `_102020_/l4/collabux/templates/categoryList.json`. No category id,
  count or description is copied into the prompt, the schema, the gate or the code — the agent reads
  the file AT RUN TIME and (a) builds the category list injected into the detail prompt and (b) hands
  the parsed catalog to the gate through the context (`helpers/nsCategoryCatalog.ts`, pure; the gate
  itself stays disk-free). Adding a category to the JSON makes it classifiable on the next run with
  no code change. `categoryRef` is deliberately NOT an enum in any schema.
- **styleRef is run configuration**, never an LLM decision: the agent stamps it (`stampNsStyleRef`)
  and only when that style really has a template folder.
- **`experienceRef` is RESERVED**: accepted and carried, not produced or validated in this phase.
- Gate severities are asymmetric on purpose: unknown `categoryRef`/alternate = ERROR (the model owns
  it, a retry fixes it); unknown `styleRef`, `confidence < 6`, a missing classification and the
  coarse shape findings = WARNING (a retry cannot fix run configuration, and a low score is signal —
  a candidate for a new category — not a failure). Catalog integrity (duplicate ids, dangling
  `parentCategory`) is a configuration ERROR.
- Every shape check that names a category id **no-ops when that id is no longer in the catalog**, so
  a rename/removal in the JSON can never break a run.
- If the catalog cannot be read, the run continues unclassified and the gate emits
  `presentation.catalog.unavailable` ONCE. ⚠️ Worth knowing: level 4 of the agent project is not part
  of what the build ships (`scripts/buildCI` `SHIP_LEVELS = ['l2']`), so that warning in the e6 trace
  is the symptom to look for if classification silently stops happening in Studio.
- `bffCall.input[].source` (`userDecision | selection | pageInput | actorSession | derived`) +
  `sourceRef` say where a command input's value comes from.

### Required ids resolve HERE (2026-07-31)

A `required` id input on a command (`id` / `<entity>Id`) is an ERROR unless it declares a source that
resolves **inside this workspace** — `bff.input.idSourceMissing` / `.idSourceUnresolved`. The fix is
cheap while the workspace is being designed and impossible later: at e7 the page is frozen, and a
picker query over another workspace's operation would break the detail/map equality and coverage
gates, so the readiness lint there can only report it.

Two ways out, both always available to the detail retry (the error message names both):
1. **A picker on this page** — add a query bffCall over an operation this workspace ALREADY hosts and
   set `source: "selection"`, `sourceRef: "<that query's bffId>"`.
2. **The id arrives with the page** — `source: "pageInput"` (a detail opened from another workspace).

`actorSession` (the logged-in actor) and `derived` (`sourceRef` = `<bffId>.<field>` of a local call)
are the remaining legitimate origins. `isNsIdInputName` is exported and shared with the e7 lint so
the two definitions of "an id" cannot drift.

## Workspace kind derivation (2026-07-11)

`kind` is canonical (`workflow | operation | entityManagement`) and DERIVED deterministically from
the classification after the LLM call (`deriveE6WorkspaceKinds`, before `repairE6WorkflowIds`):
workspaces with workflow-owned operations are `workflow`; all-standalone create+update on the
workspace entity is `entityManagement` (list-first CRUD pages downstream — tabular_classic);
anything else is `operation`. The LLM label is not trusted: the 102051 run labeled entity CRUDs as
"workflow", which rejected the CRUD template in Stage 2 by construction. `entityManagement`
workspaces never carry a workflowId (gate error).
