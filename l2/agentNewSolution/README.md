<!-- mls fileReference="_102020_/l2/agentNewSolution/README.md" enhancement="_blank" -->

# agentNewSolution

Spec-first pipeline for creating a collab.codes module through small steps, persisted artifacts under
`l4/{module}/pipeline/`, and deterministic gates before each checkpoint.

Primary specs:
- `/Volumes/WagnerSSD1/collab/todo/PropostaAgentNewSolution.md`
- `/Volumes/WagnerSSD1/collab/todo/PropostaAgentNewSolution_Tasks1.md`
- `flow.json` in this folder is the implementation contract. If code and spec diverge, update the
  spec first.

## Implemented Scope

Implemented through human checkpoint 1:
- `@@newSolution` opens the task, validates the prompt with an objective error, and creates the
  first clarification.
- `agentNsDraft` writes `e1-draft.json` and `e1-draft.md`.
- `steps/e1-draft/gate.ts` validates schema and invariants.
- Blocking E1 questions save readable partial artifacts, keep `pipeline.json` as `gate_failed`, and
  open `e1-clarification-extra` before rerunning E1.
- Non-blocking gate failures schedule one controlled retry with the gate errors in context.
- `widgetNsDraft` renders the markdown and allows Approve or Adjust.
- Adjust reruns E1 through a new controlled attempt; the widget never writes artifacts directly.
- Approve marks `e1-draft` as `approvedBy=human` in `pipeline.json`.

E2 (`agentNsJourneys`) is now implemented: from an approved (or gate-ok) E1 draft it generates
`e2-journeys.json` + `e2-journeys.md` (journeys per actor + prioritized feature catalog), validated by
`steps/e2-journeys/gate.ts` and generated with `modelType: codereasoning`. Human checkpoint 2 (the
graphical `widgetNsJourneys` and the adjustment loop) is NOT built yet: after E2 passes the gate the
step completes and the artifacts can be read from `l4/{module}/pipeline/`.

Resume: an empty `@@newSolution` (the runtime strips the mention) resumes the first module whose
Phase 1 is incomplete and re-enters at E2, so the clarification is not repeated. A non-empty prompt
starts a new module.

Known issue (blocks the in-app checkpoints): a checkpoint clarification only renders when it lives
inside an agent's `interaction.payload` (the frontend routes via `getInteractionStepId`, which walks
`interaction.payload`, not `nextSteps`). The current `checkpoint-draft` is added into `nextSteps`, so
it renders as "No found parentInteraction" - this is the "system got lost" symptom and must be fixed
before either checkpoint widget can be approved in Studio.

## Artifacts

During a real execution, E1 writes:

- `l4/{module}/pipeline/pipeline.json`
- `l4/{module}/pipeline/e1-draft.json`
- `l4/{module}/pipeline/e1-draft.md`
- `l4/{module}/trace/e1-draft-agentNsDraft-01.json`

Local fixture:

- `steps/e1-draft/fixture/cafeFlow/e1-draft.json`
- `steps/e1-draft/fixture/cafeFlow/e1-draft.md`

## How To Run

In Studio, start a task with:

```text
@@newSolution Criar um modulo para uma cafeteria pequena controlar pedidos do balcao ate a retirada.
```

Expected flow for this stage:

1. The task opens clarification 1.
2. The user answers and continues.
3. `agentNsDraft` writes E1 artifacts.
4. The draft widget appears.
5. The user adjusts or approves.

## How To Test

TypeScript validation from `mls-base`:

```bash
tsc -p tsconfig.json --noEmit
```

Unit tests included in this stage:

- `helpers/nsPipeline.test.ts`
- `helpers/nsGate.test.ts`
- `steps/e1-draft/gate.test.ts`

These files intentionally use the project's runtime test runner, including `node:test` where needed:

```bash
npm run test:102020 -- l2
```

## Checklist

- `flow.json` parses.
- Generic helpers do not know E1/E2.
- E1 has a versioned schema, separated prompt, gate and fixture.
- Root plan provides localized step titles and checkpoint `uiLabels`; widget labels use local English
  only as final fallback.
- Widget uses `StateLitElement`, no Shadow DOM, and CSS in a separate `.less` file.
- No imports from `agentNewSolution` or `agentNewSolution2`.
- No `console` in v3 files.
