<!-- mls fileReference="_102020_/l2/agentNewSolution3/steps/e2-journeys/readme.md" enhancement="_blank" -->

# E2 - Journeys

This step turns the approved E1 draft into the business view of the module: user journeys per actor
and a prioritized feature catalog. It is the second human checkpoint and the last step of Phase 1.

Inputs:
- `l4/{module}/pipeline/e1-draft.json` (only). No task payload is required, so the step also works on
  a resumed task.
- Optional adjustment request from `checkpoint-journeys`.

Outputs:
- `l4/{module}/pipeline/e2-journeys.json`
- `l4/{module}/pipeline/e2-journeys.md`
- `l4/{module}/pipeline/pipeline.json`
- Trace files under `l4/{module}/pipeline/trace/`

Model:
- `prompt.md` runs with `modelType: codereasoning` (rich journeys need reasoning).

Gate (`gate.ts`):
- Valid `e2-journeys` schema.
- Every feature is referenced by at least one journey step; every step featureRef exists.
- Every actor has at least one journey; the journey actor must be a declared actor.
- Every E1 actor is present, unless a `decisions` entry of kind `actorRemoved` records the removal.
- Ids normalized and unique (actors, journeys, steps, features, decisions).
- Priorities complete (`now | soon | later | never`).

Rules:
- Do not create ontology, pages, tables, workflows or operations.
- `businessRules` and `notes` are per-journey human inputs; adjustments must preserve them.
- The widget never writes artifacts; adjustments always rerun this step through the gate.
