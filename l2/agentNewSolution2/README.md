<!-- mls fileReference="_102020_/l2/agentNewSolution2/README.md" enhancement="_blank" -->

# agentNewSolution2 — Stage 1 (the behavior contract)

Implements `flow.json`. Stage 1 delivers ONLY the durable business model and stops before screens
(Stage 2) and backend persistence (Stage 3), which start as separate tasks consuming the frozen l4
artifacts.

## What it freezes (l4 = BUSINESS)

- `l4/{module}/module.defs.ts` — actors, capabilities, ontology MAP, relationships, approved refs.
- `l4/{module}/ontology/{EntityId}.defs.ts` — canonical entities (fields, enums, lifecycle).
- `l4/rules/{module}Rules.defs.ts` — global rules.
- `l4/workflows/{workflowId}.defs.ts` — global workflows (with embedded story).
- `l4/operations/{operationId}.defs.ts` — global operations = intent-level BFF contract (with story).
- `l5/project.json` (merge), `l5/{module}/process.defs.ts` (run record).

Never produced here: pages, per-page bffCommands, tables/persistence, layer_3/4 backend, metrics,
`journeys.defs.ts` (user stories are absorbed into each workflow/operation `story`).

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
| org-handoff | agentNewSolution2Final | container + final summary |
| behavior-validate | agentValidateBehaviorModel | **new** — deterministic, non-blocking |
| final-resume | agentNewSolution2Final | summary; on finish freezes the run |

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
- **Cleaning at finish only.** Payloads stay in the task during the run (no hydration cache); on
  "Encerrar" the final agent clears traces and cleans every completed step's inputs/outputs.
- **JSON-schema-first.** Each agent forces one tool call; the schema is both sent to collab-llm and
  re-validated locally by ns2Extract.

## Verify

Run `pnpm build` in `mls-base/` (per CLAUDE.md). The custom mls loader resolves the `/_102020_/…`
imports and the `mls` global; standard `tsc` alone will not. Syntax was checked file-by-file.
