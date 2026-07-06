<!-- mls fileReference="_102020_/l2/agentNewSolution3/skills/maintenance.md" enhancement="_blank" -->

# agentNewSolution3 Maintenance Protocol

Core rule: every maintenance change must belong to one pipeline step. If the fix needs a change under
`helpers/`, stop and request human review.

## Required Cycle

1. Reproduce the failure with a fixture.
2. Locate the owning step by the failed artifact or gate.
3. Change only the owning step folder, unless the spec requires a contract change.
4. If schema or gate behavior changes, bump the schema version and update fixtures.
5. Run the touched gate/helper tests.
6. Run replay or structural fixture comparison for the step.
7. Run `tsc -p tsconfig.json --noEmit` from `mls-base`.
8. Add one line to the step `CHANGELOG.md` with what changed and why.

## Boundaries

- Prompts live in `.md`; prompt edits should not touch TypeScript.
- Gate and schema are contracts; do not loosen a gate to hide an upstream bug.
- Widgets never write step artifacts. Every artifact change goes through agent + gate.
- No local examples or point fixes embedded in prompts or gates.
- No imports from `agentNewSolution` or `agentNewSolution2`.
- No `console`; use trace and objective task errors.

## Stop Conditions

Stop and request human review when:

- The change alters an artifact consumed by another step.
- The fix needs a generic helper change.
- The failure suggests drift between `flow.json` and code.
- The test would depend on literal LLM prose instead of structural invariants.

