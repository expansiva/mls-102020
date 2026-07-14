<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/readme.md" enhancement="_blank" -->

# create-page

## Role

`agentCfeCreatePagePhase` hosts `create-page-fanout`, deterministic review and one bounded repair round behind a single dependency barrier. `agentCfeCreatePage` only generates one page. `agentCfeCreatePageReview` reads the saved page/shared defs, runs the executable layout checks and schedules normal sequential repair steps for rejected pages.

## Input

- Phase args: `{ "planId": "create-pages", "pageIds": ["..."], "maxParallel": 5 }`.
- Worker args: `{ "pageId": "..." }`; repair adds `qualityFeedback`.
- Reduced context from `preparePageCreate`.
- `prompt.md` plus `skills/uxGuidance.ts`.

## Output

- `l2/{module}/web/contracts/{page}.defs.ts`.
- `l2/{module}/web/shared/{page}.defs.ts`.
- `l2/{module}/web/desktop/page11/{page}.defs.ts` and variants when configured.
- Trace diagnostics for warnings.
- Review PASS/PENDING trace after at most one repair round.

## Invariants

- The LLM only generates layout; contract and shared reconciliation remain deterministic.
- Every layout variant must represent all operations independently.
- Legal actions are only `shared.availableActions`; unknown UI-only actions are rejected or reconciled.
- Fan-out children never retry, add steps or fail the parent; they persist a reviewable candidate or complete with a pending trace.
- Repair is owned by a sequential review step with unique planIds, followed by one final review.
- Materialization depends on the `create-pages` phase barrier, not directly on the fan-out.
