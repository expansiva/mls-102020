<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/readme.md" enhancement="_blank" -->

# create-page

## Role

`agentCfeCreatePage` is the worker used by `create-page-fanout`. It creates one page's contract deterministically, asks the LLM for the semantic layout, then saves page variants and shared state/actions through deterministic reconciliation.

## Input

- Step args: `{ "pageId": "..." }`.
- Reduced context from `preparePageCreate`.
- `prompt.md` plus `skills/uxGuidance.ts`.

## Output

- `l2/{module}/web/contracts/{page}.defs.ts`.
- `l2/{module}/web/shared/{page}.defs.ts`.
- `l2/{module}/web/desktop/page11/{page}.defs.ts` and variants when configured.
- Trace diagnostics for warnings.

## Invariants

- The LLM only generates layout; contract and shared reconciliation remain deterministic.
- Every layout variant must represent all operations independently.
- Legal actions are only `shared.availableActions`; unknown UI-only actions are rejected or reconciled.
