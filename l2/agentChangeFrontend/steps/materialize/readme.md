<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/readme.md" enhancement="_blank" -->

# materialize

## Role

`agentCfeMaterializeL2` plans stale `.defs.ts` materialization. `agentCfeMaterializePhase` runs phase barriers and bounded verification/repair. `agentCfeMaterializeGen` generates each `.ts` or companion `.test.ts` artifact.

## Input

- Generated `.defs.ts` pipelines.
- Existing materialized `.ts` files and hash/staleness checks.

## Output

- Materialized contracts, shared files and page files.
- Phase verify traces and repair traces when needed.

## Invariants

- Phase order is contracts -> shared -> pages.
- Fan-out workers should complete with trace instead of failing the whole dynamic parent when recovery is expected.
- Repair is bounded; do not re-open unlimited prompt loops.

Todo host de fan-out daqui (materialize, rodada de repair, split de organismos, composição da
página) nasce com `onFailure: 'wait_after_prompt'` — a política mora no `createFanoutStep`, um lugar
só. Sem ela, um erro de LLM em UM slot marca o step como failed **com** `newTaskStatus: 'failed'` e
derruba a task inteira no meio do fan-out. Com ela, o slot conclui com `MATERIALIZE-FAILED: missing
generated code` e o `verify` da fase o lista broken e repara — o caminho que este fan-out já tinha.
Ver `flow.json → engineInvariants`.
