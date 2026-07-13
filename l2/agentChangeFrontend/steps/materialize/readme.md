<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/materialize/readme.md" enhancement="_blank" -->

# materialize

## Role

`agentCfeMaterializeL2` plans stale `.defs.ts` materialization. `agentCfeMaterializePhase` runs phase barriers and bounded verification/repair. `agentCfeMaterializeGen` generates each `.ts`, `.html` or companion `.test.ts` artifact.

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
