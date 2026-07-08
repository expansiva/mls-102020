# E7 — Validation & Closing (agentNs3Validation)

Deterministic global recheck + closing of the agentNewSolution3 pipeline. **This step has NO LLM
call**: `beforePromptStep` does all the work and returns intents directly (update-status / add-step
instead of `prompt_ready` — the documented no-LLM pattern in `mls-base/skills/collab_messages.md`
"Agent hooks"). There is no prompt.md and no JSON schema file, because there is no LLM output to
validate. `afterPromptStep` is intentionally absent: both hooks are optional in `IAgentAsync`
(`mls-102027/l2/aiAgentBase.ts`) and the step finishes inside `beforePromptStep`.

Single run (`planId: e7-validation-summary`). Module resolution: `args.moduleName`, else the first
module whose `pipeline.json` has `e6-journey-map` approved and E7 not yet approved (or dirty).

## What it reads (files only, never task payloads)

`pipeline/e1-draft.json` (optional), `pipeline/e2-journeys.json`, `pipeline/e3-model.json`, every
`l4/{module}/ontology/{EntityId}` entity defs, `pipeline/e4-actors-rules.json` (actors + rules +
externalRefs), `pipeline/e5-classification.json`, every `l4/workflows/{id}` and `l4/operations/{id}`
defs listed by the classification, and the `l4/{module}/journeys/{module}Journeys` defs from E6.

## Health-report codes (`gate.ts:computeNs3HealthReport`, v2 style)

| Code | Severity | Meaning |
|------|----------|---------|
| `plan.disk.divergence` | error | e5-classification workflow/operation sets differ from the defs on disk |
| `workflow.operation.unknown` | error | workflow orchestrates an operation with no def |
| `workflow.operations.missing` | error | workflow def with an empty operationIds list |
| `entity.ref.unknown` | error | workflow entities / operation entity/reads/writes outside the ontology |
| `actor.unknown` | error | workflow/operation actor not in the E4 roster |
| `rule.unknown` | warning | rulesApplied id not in the E4 rule set |
| `operation.pageId.missing` / `operation.commandName.missing` | error | deterministic naming parts absent |
| `operation.bffName.mismatch` | error | bffName != `{module}.{pageId}.{commandName}` |
| `operation.accessPattern.missing` | error | operation without accessPattern |
| `operation.accessPattern.key.unknown` | error | keyField `Entity.field` does not resolve to a real entity field |
| `journey.missing` | error | E6 journey map defs not found |
| `journey.workspace.operation.unknown` | error | workspace references an operation with no def |
| `journey.operation.unreachable` | error | operation reachable from no workspace |
| `capability.unowned` | error (now) / warning (soon/later) | non-never E2 feature not covered by any classification featureRefs |
| `capability.multiowned` | warning | one capability owned by more than one workspace |

## What it writes

- `l4/trace/behavior-health-report.json` — ALWAYS (pass or fail): `{moduleName, savedAt, report}`.
- On a green report only (closing artifacts, same paths/formats Stage 2/3 already consume):
  - `l4/{module}/module.defs.ts` — module block (E3) + designContext (E1 prompt/open questions +
    E2 userLanguage/decisions) + ontology index (entity files) + journey defPath + relationships +
    approvedArtifacts (E4 externalRefs);
  - `l5/{module}/todoFrontend.defs.ts` and `l5/{module}/todoBackend.defs.ts` — the SAME owners list
    (one `toCreate` owner per workflow/operation) in both layers: the single generation-status
    source for Stage 2/3;
  - `l5/{module}/process.defs.ts` — run record with sourceRefs, handoff notes (report warnings)
    and the pending stage2/stage3 next steps;
  - `pipeline/e7-validation.md` — human summary (`gate.ts:renderE7Markdown`).
- `pipeline/pipeline.json` — gate result + approval (`approvedBy: auto`), and the completed
  `e7-done` anchor result unlocks whatever depends on the finished spec.

## Errors are upstream bugs

E7 validates artifacts that earlier gates already approved, so a red health report means a bug in
the step that PRODUCED the inconsistent artifact — never something to patch here. There is NO retry
step: the step fails with the top error lines in the trace message, the full report stays in
`l4/trace/behavior-health-report.json`, and the user reruns E7 after fixing the upstream step
(dirty propagation in pipeline.json refuses to skip stale artifacts). Loosening a check to make a
module pass = upstream bug, per flow.json `conventions.schemas`.

## Tests

`gate.test.ts` runs under `node:test` — `gate.ts` is pure (all data arrives as parameters, no stor
access), so no browser runtime is needed.
