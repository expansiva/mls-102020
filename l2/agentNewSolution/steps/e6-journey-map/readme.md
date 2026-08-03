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

### Every required input, and landings are opened cold (2026-08-02, improveJourneys T2)

The rule above covers COMMANDS and id-shaped names only, and it does not know what a landing is. Two
errors close that (`validateRequiredInputSources`):

- **`bff.input.sourceMissing`** — a `required` input with NO `source`, on any call of any workspace,
  query and non-id names included. The 102045 run shipped `viewJobCostSummary.projectId` required, on a
  query, with no source at all: outside the command-only id rule, it passed e6 AND e7 with zero
  findings, and the billing actor landed on a page asking for an id that exists nowhere. A case the
  command-id rule already reports keeps its richer message — one input never produces two errors.
- **`landing.requiresPageInput` / `landing.input.unresolved`** — a workspace that some actor LANDS on is
  opened cold: no navigation hands it anything, so a required `pageInput` has no sender by construction
  and a `selection`/`derived` that does not resolve inside the page is unreachable.

The legitimate shape the rule must not forbid is the page that works on the CURRENT record of an ongoing
process (the open period, the record in progress). The way out — named in the error message and in
`promptDetail.md` — is that the current record is a QUERY RESULT: the page hosts a query that resolves
it from the actor's own context and feeds the input from that call. What is forbidden is a page that
assumes it was handed the id.

The landings of the workspace under detail are passed into the detail-phase gate and stated in the
detail prompt (the site-map slice does not carry them), so the retry can fix this while the page is
still being designed — at finalize the page is written and only a rerun could repair it.

## Journeys derivation (2026-08-02, improveJourneys T1)

`journeys.ts` derives `l4/{module}/journeys/{journeyId}.defs.ts` at finalize: the e2 narrative plus two
DERIVED links — the operations the journey exercises and the workspace it happens in. The first version
took "any operation sharing any featureRef with any step" and `workspaces.find()` in declaration order,
which in the 102045 run gave one journey 20 operations (including `deleteClient`) and anchored 5 of 11
journeys on the same dashboard, two of them for actors that page excludes.

**operationIds** — three narrowing rules, each killing one defect class, none domain-specific:

1. **Per step, full coverage.** An operation serves a step when it covers ALL of the step's
   `featureRefs` (⊇, not ∩): a step tagged "projects + costing" is not served by an operation that only
   knows costing. Features are coarse — one featureRef in the 102045 run carried 13 operations — and the
   old whole-journey union let any of them in. A step whose combination no operation covers contributes
   nothing, on purpose: the union over its features is exactly the diffuse set this rule removes (a
   cafeFlow step tagged "menu + stock + dashboard" matches 8 operations of 3 entities and would decide
   the journey's subject by itself).
2. **Actor.** The classification says who performs each operation; a journey exercises its own actor's.
3. **Primary entity.** A journey is about the record it changes: keep the operations of the entity that
   owns the most WRITE operations of the journey, plus any step's operations back when the filter would
   have left that step with nothing.

**Tie-breaks (deterministic, in order)** — the primary entity: most write operations → most operations →
id order. The anchor: most of the journey's operations hosted among the workspaces that include the
actor → the page hosting the journey's WRITES (a journey lives where it acts; the entity it writes to
does not always own a page — cafeFlow's `StockAdjustment` does not) → the actor's landing → declaration
order. When the actor owns no workspace at all, the anchor falls back to the best host and the gate
reports `journey.anchor.actorMismatch` (an actor cannot live on a page that excludes them).

Fields the derivation reads beyond `operationId/featureRefs` (`actorId`, `entity`, `kind`) are all
OPTIONAL: a classification that does not declare one skips the filter it feeds, it never drops the
operation.

**Consequence to expect:** a narrowed journey no longer sweeps up every operation, so operations that no
journey is actually about now raise `journey.operation.unreferenced` (WARNING) instead of hiding inside
a bag — 8 of 42 on the 102045 run, including the whole client CRUD, for which that e2 has no journey at
all. That is signal for the e2, not a defect of the derivation.

The l4 shape does not change (same fields, better values) and the acceptance test is the T0 ruler:
re-deriving from the frozen inputs of the three baseline runs zeroes M3 and M4 while leaving the
workspace-level metrics identical (`journeys.test.ts`). Note that M3 is an INVARIANT ASSERTION after
this change, not an independent measure — the anchor maximizes the very quantity M3 checks. What
discriminates a good anchor is the named-anchor test over the two audited runs.

## Baseline metrics (2026-08-02, improveJourneys T0)

`metrics.ts` measures six properties of a FINISHED l4 (`measureNsJourneyMetrics`, pure). It is the
ruler for the improveJourneys package: the same function measures the frozen fixtures under
`fixture/baseline/<name>/` and the l4 of the T7 validation run, so "better" is a number, not an
opinion. Every metric is computed over the artifacts **as written on disk** — never over a
recomputed candidate set, which is what makes it valid to re-run it on the output of a change.

| id | measures | rule |
|---|---|---|
| M1 | required ids with no verifiable provider | over every `bffCall` of every workspace, a `required` input whose name is an id (`isNsIdInputName`) counts when its `source` is `pageInput`, is missing/`userDecision`, is `selection` with a `sourceRef` that is not a query of this workspace, or is `derived` from a non-local call |
| M2 | workflow pages with no reading surface | workspaces of `kind: "workflow"` with zero `query` bffCalls |
| M3 | journeys with a weak anchor | `journeys/{id}.defs.ts` whose `workspaceId` is unknown, does not list the journey's `actorId`, or hosts strictly fewer of the journey's own `operationIds` than some other workspace |
| M4 | journeys that are a bag of operations | `operationIds.length > 2 * steps.length` |
| M5 | landings that are not self-sufficient | a `siteMap.landings` workspace with a `required` input that cannot be satisfied on arrival (`pageInput`, an id with no source/`userDecision`, or an unresolved `selection`/`derived`) |
| M6 | journeys that say where the actor comes from | e2 journeys with a non-empty `trigger` (today) or `prerequisite` (after T3) |

M1 and M5 depend on the `input.source` contract, which earlier revisions did not have (cafeFlow,
petShop). On those artifacts the measurement declares `mode: "structural"` and falls back to "does
another query of the same workspace output a field with this name" — a call never provides its own
input and a command output is never a provider. Structural mode is comparable across revisions but
it is NOT a defect list: it also flags ids that a modern artifact would legitimately declare as
`actorSession`, and it cannot see item fields that an old paginated envelope left undeclared.

`fixture/baseline/<name>/baseline-metrics.json` freezes the measurement per fixture plus
`notedInAnalysis` — the figure `todo/newSolution/jorneys.md` states and, where they differ, why.
The measured value is the authoritative one; the analysis figures were counted by inspection.
The e2 artifact of each fixture lives in its owning step (`steps/e2-journeys/fixture/baseline/`),
which the e6 test reads as data — the same crossing production does (e2-journeys.json is a declared
e6 input), never a code import.

## Workspace kind derivation (2026-07-11)

`kind` is canonical (`workflow | operation | entityManagement`) and DERIVED deterministically from
the classification after the LLM call (`deriveE6WorkspaceKinds`, before `repairE6WorkflowIds`):
workspaces with workflow-owned operations are `workflow`; all-standalone create+update on the
workspace entity is `entityManagement` (list-first CRUD pages downstream — tabular_classic);
anything else is `operation`. The LLM label is not trusted: the 102051 run labeled entity CRUDs as
"workflow", which rejected the CRUD template in Stage 2 by construction. `entityManagement`
workspaces never carry a workflowId (gate error).

### `pageInput` needs a creditor (2026-08-02, improveJourneys T5)

`pageInput` was a unilateral claim — "this id arrives with the page" — that nothing could check: 20 of
them shipped in the 102045 run with no provider anywhere, and `gate.test.ts` literally asserted the
branch was empty. Two things can feed a page, both verifiable:

1. **A navigation into it.** An edge carries a field when the page it comes FROM displays that field in
   a query output, AND both pages serve a common actor (an edge across disjoint actors is a HANDOFF —
   the other person's screen was never this actor's page context), AND the field is not the id of the
   record the edge's own operation CREATES (it does not exist when the navigation is decided). That last
   clause is the whole 102045 case in one rule: on the single edge `projectDetail → changeOrder (via
   createChangeOrder)`, `projectId` is carried and `changeOrderId` is not.
2. **Declared context.** A journey whose `prerequisite.carries` (T3, approved by the human at the e2
   checkpoint) names the record, resolved to an entity and matched to the id by the `<entity>Id`
   convention. `deriveNsE6PageContext` spreads a journey's carries over the page it starts on and the
   pages its operations live in.

Neither → `bff.input.pageInputUnfed` (ERROR). **When the convention cannot decide** — the id name
resolves to no declared entity, or the page has declared carries that resolve to none — it degrades to
`bff.input.pageInputUnverified` (WARNING): inventing an error over a naming convention would burn the
run's one repair round on a page that may be perfectly fine.

Scope: this does NOT force a query onto every command page (P2 stays out). A command-only workspace is
legitimate as long as something feeds its ids. Landings are excluded here — T2 owns them, so one input
never produces two errors. And the check needs the whole map, so it runs at **finalize**: during the
detail fan-out the other pages may not be written yet (`wholeMap: false` in the scoped context).
