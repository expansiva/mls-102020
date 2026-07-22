<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/readme.md" enhancement="_blank" -->

# E2 - Journeys

This step turns the approved E1 draft into the business view of the module: user journeys per actor
and a prioritized feature catalog. It is the second human checkpoint and the last step of Phase 1.

Inputs:
- `l4/{module}/pipeline/e1-draft.json` (only). No task payload is required, so the step also works on
  a resumed task.
- Optional adjustment request from `checkpoint-journeys`.

Outputs:
- `l4/{module}/pipeline/e2-journeys.json`
- `l4/{module}/pipeline/e2-journeys.md` (audit summary/delta; JSON is the source of truth)
- `l4/{module}/pipeline/pipeline.json`
- Trace files under `l4/{module}/trace/`

Model:
- `prompt.md` runs with `modelType: reasoning` (rich journeys need reasoning).

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
- The markdown artifact records what changed; it must not duplicate the full JSON catalog.

Widget (`widgetNsJourneys.ts`):
- Custom element: `<widget-ns-journeys-102020>`.
- Input: either the full `NsE2JourneysArtifact` as `value`, or `{ moduleName, project? }` to load
  `l4/{module}/pipeline/e2-journeys.json` from `mls.actualProject` or an explicit project such as
  `102051`.
- Renders actor lanes, searchable journey list, selected journey detail, editable
  `businessRules[]`/`notes`, editable feature priority chips, version/history, and the prompt bar.
- Emits `ns-journeys-change` for local edits and `ns-journeys-review` with payload type
  `checkpoint-journeys-answer` for approve/adjust.
- The review payload includes `edits`, immutable `changes`, and a `proposedArtifact`, but persistence
  remains the responsibility of the checkpoint/adjustment flow.
- `agentNsJourneys.openStepView` mounts this widget through the existing task feedback "open/abrir"
  action. It rebuilds state from persisted `e2-journeys.json`, matching the `agentNewSolution2Final`
  pattern.
