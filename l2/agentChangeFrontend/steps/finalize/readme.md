<!-- mls fileReference="_102020_/l2/agentChangeFrontend/steps/finalize/readme.md" enhancement="_blank" -->

# finalize

## Role

`agentCfeCreateFinalize` verifies create/register markers and marks processed L5 owners as done.

## Input

- Frontend create page traces.
- Register page traces.
- L5 `todoFrontend` owners.

## Output

- `l2/{module}/trace/frontend-create-report.json`.
- Updated L5 owner statuses.

## Invariants

- Owners are marked done only when their generated page and register markers are present.
- Failed or unverified owners remain visible in trace instead of being silently completed.
