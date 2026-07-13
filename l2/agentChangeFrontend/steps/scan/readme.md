<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/scan/readme.md" enhancement="_blank" -->

# scan

## Role

`agentCfeCreateScanL4` reads the current L4/L5 frontend context and decides whether there is create work.

## Input

- Root command parsed by `agentChangeFrontend.ts`: `/run`, `/rebuild all` or `/rebuild defs`.
- L5 `todoFrontend` owners and L4 business artifacts.

## Output

- No pages: optional `materialize-create-l2` when materialization is enabled.
- Pages: `create-page-fanout` with one page item per generated page and progress counters.

## Invariants

- L4 is read-only.
- Page workers run through `parallel_dynamic` with `maxParallel = 5`.
- Children must receive compact args: `{ "pageId": "..." }`.
