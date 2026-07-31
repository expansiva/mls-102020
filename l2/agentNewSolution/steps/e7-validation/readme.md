# E7 — Validation & Closing (agentNsValidation)

Deterministic global recheck + closing of the agentNewSolution pipeline. **This step has NO LLM
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
externalRefs), `pipeline/e5-classification.json`, every `l4/{module}/workflows/{id}` and `l4/{module}/operations/{id}`
defs listed by the classification, and the E6 journey map reassembled from `l4/{module}/navigation.defs.ts` (workspaceIds index + landings) + `l4/{module}/workspaces/{workspaceId}.defs.ts`.

## Health-report codes (`gate.ts:computeNsHealthReport`, v2 style)

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

- `l4/{module}/trace/behavior-health-report.json` — ALWAYS (pass or fail): `{moduleName, savedAt, report}`.
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
`l4/{module}/trace/behavior-health-report.json`, and the user reruns E7 after fixing the upstream step
(dirty propagation in pipeline.json refuses to skip stale artifacts). Loosening a check to make a
module pass = upstream bug, per flow.json `conventions.schemas`.

## Template-readiness lint (2026-07-31, improveNewSolution T4/T6)

`templateLint.ts` (pure) answers one question per classified workspace: does this contract satisfy
the `minimumRequired` declared by its page category in `categoryList.json`, so the l2 renderer can
resolve the category template instead of the generic fallback?

- **It only touches the FORM of the contract.** The one mutation it may make is lifting a `list`
  output into a paginated envelope (the item columns are unchanged, and no `total` is invented —
  `<op>.total` may not exist in the operation, and the e6 gate would reject the unresolvable `from`).
  It never adds, removes or edits an entity, a rule or an operation. When the gap is business
  semantics, the answer is to DOWNGRADE the classification, never to invent the missing business.
- Outcomes: `ok` | `repaired` | `downgraded` (to the best alternate the contract actually satisfies)
  | `unready` (`presentation.templateReady = false`) | `skipped` (no `minimumRequired` for that
  category yet, or no catalog — warn, never judge). A downgrade never lands on a category without a
  `minimumRequired`: claiming a readiness nobody can verify is worse than admitting not-ready.
- **Universal rule**, independent of category: a REQUIRED id input on a command with no `source` (or
  `source: userDecision`) is a finding — an id is selected, derived or carried by the page, never
  typed. Reported, not auto-repaired: the fix (a picker query over another workspace's browse
  operation, or a navigation contract) is a site-map decision and injecting it here would break the
  e6 detail/map equality and coverage gates.
- **It runs BEFORE the closing artifacts** because `emitNsBffContracts` derives the wire contracts
  from these same workspaces — repairing after the emit would ship stale contracts. Repaired
  workspaces are rewritten whole, so `sliceHash` and every untouched field survive.
- Readiness gaps are always WARNINGS: a page that falls back to the generic template is not a broken
  module, and e7 fails the run on errors.
- **T6 coverage**: `l4/{module}/trace/template-readiness.json` per run + the workspace × category ×
  confidence × templateReady table appended to `pipeline/e7-validation.md`. Aggregated across
  projects: an orphan page (confidence < 6) in 2+ projects is a candidate for a NEW category; a
  category that keeps being downgraded is a candidate for a split.

## Tests

`gate.test.ts` and `templateLint.test.ts` run under `node:test` — both modules are pure (all data
arrives as parameters, no stor access), so no browser runtime is needed. `templateLint.test.ts`
loads the REAL `categoryList.json`, so it is also the contract between the lint and the
`minimumRequired` blocks.
