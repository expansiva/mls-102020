# E2 — permanent business journeys

E2 turns the approved E1 module contract into permanent, human-approved business journeys.

Before approval it writes only `l4/{module}/pipeline/e2-journeys.draft.json`. The checkpoint displays
the proposed journeys and accepts either approval or a free-text change request. A change request
starts another generation round using the previous draft as context and returns to the checkpoint.

Approval writes:

- `l4/{module}/journeys/{journeyId}.defs.ts` for each journey;
- `l4/{module}/journeys/index.defs.ts` for discovery and feature mapping;
- E2 approval state in `module.defs.ts` and `pipeline/pipeline.json`.

Every journey freezes its `business` block with a stable SHA-256 hash. `resolution` and `realization`
start pending so later steps can add ontology and implementation bindings without rewriting the
human-approved business intent.

The gate treats business context as a first-class contract. A command journey must carry, locate or
receive a named record such as `selectedProject`; it must never make a future page ask for a raw id.

Local smoke testing can validate and materialize an approved E1 folder without the Studio runtime:

```text
tsx --import test/register-hooks.mjs --import test/setup-l2.ts \
  mls-102020/l2/agentNewSolution4/steps/e2/nodejsSmoke.ts \
  <absolute-l4-module-dir> <absolute-e2-review.json> [--write|--verify]
```

The command defaults to dry-run. `--write` refuses to overwrite an already approved E2; `--verify`
recomputes every business hash and compares the written permanent business blocks with the review.
