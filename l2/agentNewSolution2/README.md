<!-- mls fileReference="_102020_/l2/agentNewSolution2/README.md" enhancement="_blank" -->

# agentNewSolution2 — Stage 1 (the behavior contract)

Implements `flow.json`. Stage 1 delivers ONLY the durable business model and the deterministic BFF
name handoff. It stops before screens/contracts (Stage 2) and backend persistence/controllers
(Stage 3), which start as separate tasks consuming the frozen l4 artifacts.

## What it freezes (l4 = BUSINESS)

- `l4/{module}/module.defs.ts` — module meta, **`designContext`** (initial prompt + userLanguage +
  openDetails + priority decisions, so Stage 2 has the original intent), ontology index, relationships,
  approved refs. **No top-level `capabilities`** (realized — with priority — on each workflow/operation)
  and **no `actors`** (moved to `l4/actors`).
- `l4/{module}/ontology/{EntityId}.defs.ts` — canonical entities (fields, enums, lifecycle).
- `l4/actors/{module}Actors.defs.ts` — authorization roster: each actor + a JWT role scope
  `{module}:{actorId}` (e.g. `cafeFlow:managerOwner`) the runtime can enforce later.
- `l4/rules/{module}Rules.defs.ts` — global rules.
- `l4/workflows/{workflowId}.defs.ts` — global workflows (states aligned to the entity lifecycle, with embedded story) plus canonical `pageId`.
- `l4/operations/{operationId}.defs.ts` — global operations = intent-level BFF contract (with story) plus canonical `pageId`, `commandName` and `bffName`.
- `l5/project.json` (merge), `l5/{module}/process.defs.ts` (run record).

Never produced here: page implementation files, l2 contract/shared/page defs, tables/persistence,
layer_3/4 backend, metrics. Stage 1 only publishes the stable BFF names that those later artifacts
must reuse.
User stories live as the embedded `story` on each workflow/operation; no separate journeys artifact
is produced.

## Tree (planId → agent)

| planId | agent | notes |
|---|---|---|
| org-requirements | agentNewSolution2Requirements | first clarification + decisions |
| req-discover-scope | agentNs2DiscoverScope | |
| req-recommend-implementations | agentNs2Recommend | behavior-level only |
| org-domain | agentNewSolution2Domain | container |
| plan-solution-blueprint | agentNs2Blueprint | confirms module name |
| plan-blueprint-review | agentNs2BlueprintReview | non-blocking |
| plan-finalize-solution-plan | agentNs2Finalize | writes l4 domain + spawns entity fan-out |
| plan-entity-definition | agentNs2EntityDefinition | fan-out (1/entity) |
| plan-mdm / plan-horizontals / plan-plugins | agentNs2Mdm / agentNs2Horizontals / agentNs2Plugins | references |
| org-behavior | agentNewSolution2Behavior | container |
| plan-behavior-classification | agentClassifyBehavior | **new** — workflow vs operation + stories |
| plan-workflow-index | agentNs2WorkflowIndex | spawns workflow fan-out |
| plan-workflow-definition | agentNs2WorkflowDefinition | fan-out (1/workflow) |
| plan-operation-index | agentPlanOperationIndex | **new** — spawns operation fan-out |
| plan-operation-definition | agentPlanOperationDefinition | **new** — fan-out (1/operation) |
| org-handoff | agentNewSolution2Handoff | no-LLM container (separate from Final so only final-resume shows the "open summary" link) |
| behavior-validate | agentValidateBehaviorModel | **new** — deterministic, non-blocking, reads saved l4 files |
| final-resume | agentNewSolution2Final | **auto-finish** (no clarification): freezes run, cleans, completes; openStepView shows the summary |

## Plumbing (self-contained, no imports from the old agentNewSolution)

- `ns2Extract.ts` — planner-output extraction + the local JSON-schema validator (mirrors the schema
  collab-llm enforces).
- `ns2Schemas.ts` — every tool's strict JSON schema.
- `ns2Shared.ts` — intent builders, getters, fan-out intent, deterministic ref helpers.
- `ns2Artifacts.ts` — l4 defs writers, module-name confirmation, trace, checkpoints, finish cleanup.
- `ns2Plan.ts` — plan-ids + module-name normalization. `ns2Snapshot.ts` — planning snapshot.
- `skills/platform.md` — platform baseline (what NOT to model).

## Design decisions (vs the legacy agentNewSolution)

- **Regenerated clean, renamed, self-contained.** New agent names (`agentNs2*` + the four new ones)
  so it can coexist while the old flow is retired. No flow1 references.
- **Module name confirmed early, no temp folder.** Nothing is written before agentNs2Blueprint
  records `module-name-final`; every later agent runs after it, so the legacy `_traceTemp` migration
  dance is gone.
- **Deterministic ref-integrity instead of the 3-file LLM critic loop.** Index agents normalize ids
  and check that every reference resolves to a canonical ontology id (the analise11/12 guardrail);
  unresolved refs become warnings, never a hard fail. A checkpoint is frozen per index.
- **Container dependency invariant.** A passive (no-LLM) container only completes once its children
  are terminal, so **a child must never `dependsOn` its own container** (that deadlocks: parent waits
  for child, child waits for parent). Children gate on the SAME upstream planIds the container gates
  on. This is why `behavior-validate` depends on `[plan-workflow-definition, plan-operation-definition]`,
  not on `org-handoff`. `final-resume` then auto-completes the container + root explicitly as a safety net.
- **Automatic finish.** No blocking final clarification: after validate, `final-resume` runs in a
  hook (`beforePromptStep`) that writes the run record with source refs, clears traces, cleans the
  task inputs/outputs and completes the task. The summary is re-openable via `openStepView`. (Doing
  the finish in a hook — not a UI event handler — avoids the silent-stall failure mode.)
- **File-fallback after fan-outs.** Parallel fan-out children are pre-allocated, reused and deleted by
  the backend, so consumers that run after a fan-out (validate, final handoff) read the SAVED
  `l4/.../*.defs.ts` via `ns2Artifacts.read{OntologyEntities,WorkflowDefs,OperationDefs}` — never the
  task payloads.
- **Actors as authz roster.** Actors are persisted to `l4/actors/{module}Actors.defs.ts` with a JWT
  `roleScope` (`{module}:{actorId}`).
- **Capabilities realized on behaviors (no standalone artifact).** Each workflow carries
  `capabilities[]` and each operation carries `capability` (id + title + priority), attached
  mechanically at save — so workflows/operations are the source of truth for "which feature + phase".
  The priority rationale also lives in `module.defs.ts.designContext.decisions`.
- **Per-stage owner status for Stage 2/3.** Each persisted workflow/operation carries TWO independent
  statuses — `statusFrontend` and `statusBackend` (each `toCreate|toUpdate|toRemove|inProgress|done`),
  both seeded `toCreate`. `agentChangeFrontend` reads/writes `statusFrontend`; `agentChangeBackend`
  reads/writes `statusBackend`. Each reconciler processes owners whose own status `!= done` and flips
  it independently (no single-status ambiguity). Stage 1 leaves an explicit per-stage to-do list.
- **BFF naming source of truth.** Each workflow carries canonical `pageId`. Each operation carries
  `pageId`, `commandName` and `bffName = {moduleName}.{pageId}.{commandName}`. The operation page is
  the workflow that orchestrates it, or the operation itself when no workflow owns it. Stage 2 and
  Stage 3 must reuse `bffName` instead of deriving route keys independently.
- **Full behavior coverage.** Classification covers every non-`never` capability (now/soon/later), so
  user-requested key screens that landed as `soon` (dashboards, AI) still become operations → pages.
  Each stateful workflow must list `operationIds`; the index fills them from the classification if empty.
- **JSON-schema-first.** Each agent forces one tool call; the schema is both sent to collab-llm and
  re-validated locally by ns2Extract.

## Verify

Run `tsc` in `mls-base/` per `todo/specAuraForge.md`. Do not use `pnpm build` for this validation.
