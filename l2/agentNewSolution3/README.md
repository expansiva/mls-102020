<!-- mls fileReference="_102020_/l2/agentNewSolution3/README.md" enhancement="_blank" -->

# agentNewSolution3

Spec-first pipeline for creating a collab.codes module through small steps, persisted artifacts under
`l4/{module}/pipeline/`, and deterministic gates before each checkpoint.

Primary specs:
- `/Volumes/WagnerSSD1/collab/todo/PropostaAgentNewSolution3.md`
- `/Volumes/WagnerSSD1/collab/todo/PropostaAgentNewSolution3_Tasks1.md`
- `flow.json` in this folder is the implementation contract. If code and spec diverge, update the
  spec first.

## Implemented Scope

Implemented through human checkpoint 1:
- `@@newSolution3` opens the task, validates the prompt with an objective error, and creates the
  first clarification.
- `agentNs3Draft` writes `e1-draft.json` and `e1-draft.md`.
- `steps/e1-draft/gate.ts` validates schema and invariants.
- Blocking E1 questions save readable partial artifacts, keep `pipeline.json` as `gate_failed`, and
  open `e1-clarification-extra` before rerunning E1.
- Non-blocking gate failures schedule one controlled retry with the gate errors in context.
- `widgetNs3Draft` renders the markdown and allows Approve or Adjust.
- Adjust reruns E1 through a new controlled attempt; the widget never writes artifacts directly.
- Approve marks `e1-draft` as `approvedBy=human` in `pipeline.json`.

E2 and human checkpoint 2 are out of this delivery. The item appears as planned, but
`agentNs3Journeys` must not execute yet.

## Artifacts

During a real execution, E1 writes:

- `l4/{module}/pipeline/pipeline.json`
- `l4/{module}/pipeline/e1-draft.json`
- `l4/{module}/pipeline/e1-draft.md`
- `l4/{module}/pipeline/trace/e1-draft-agentNs3Draft-01.json`

Local fixture:

- `steps/e1-draft/fixture/cafeFlow/e1-draft.json`
- `steps/e1-draft/fixture/cafeFlow/e1-draft.md`

## How To Run

In Studio, start a task with:

```text
@@newSolution3 Criar um modulo para uma cafeteria pequena controlar pedidos do balcao ate a retirada.
```

Expected flow for this stage:

1. The task opens clarification 1.
2. The user answers and continues.
3. `agentNs3Draft` writes E1 artifacts.
4. The draft widget appears.
5. The user adjusts or approves.

## How To Test

TypeScript validation from `mls-base`:

```bash
tsc -p tsconfig.json --noEmit
```

Unit tests included in this stage:

- `helpers/ns3Pipeline.test.ts`
- `helpers/ns3Gate.test.ts`
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
