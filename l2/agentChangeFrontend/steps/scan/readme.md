<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/readme.md" enhancement="_blank" -->

# scan

## Role

`agentCfeCreateScanL4` reads the current L4/L5 frontend context and decides whether there is create work.

## Input

- Root command parsed by `agentChangeFrontend.ts`: `/run`, `/rebuild all` or `/rebuild defs`.
- L5 `todoFrontend` owners and L4 business artifacts.

## Output

- No pages: optional `materialize-create-l2` when materialization is enabled.
- Pages: deterministic `create-contract-shared-fanout`, then `create-layout-fanout` with one pinned
  page/genome/template item per LLM call, then `reconcile-shared-fanout`.

## Invariants

- L4 is read-only.
- Page workers run through `parallel_dynamic` with `maxParallel = 5`.
- The scan reads L4 once and workers reuse its execution cache; layout args stay compact and pinned.
