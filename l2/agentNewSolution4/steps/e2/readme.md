# E2 — permanent business journeys

E2 turns the approved E1 module contract into permanent, human-approved business journeys.

Before approval it writes only `l4/{module}/pipeline/e2-journeys.draft.json`. A deterministic gate
first validates internal structure and context flow. An independent `🔎` reasoning-model judge then
compares the complete E1 contract with the draft. Only a judged-complete proposal reaches the `👤`
checkpoint, where the user may approve or make a free-text change request. A change request starts
another generation round using the previous draft as context and returns through the same gate and
judge before reopening the checkpoint.

The proposal LLM returns an internal `flexible` payload rather than a clarification. This prevents an
ungated candidate from briefly opening the journey widget while the deterministic gate, repair and
coverage judge are still running. Guided review means that every approved checkpoint is shown; it
does not bypass these pre-review quality gates.

Approval writes:

- `l4/{module}/journeys/{journeyId}.defs.ts` for each journey;
- `l4/{module}/journeys/index.defs.ts` for discovery and feature mapping;
- E2 approval state in `module.defs.ts` and `pipeline/pipeline.json`.

Every journey freezes its `business` block with a stable SHA-256 hash. `resolution` and `realization`
start pending so later steps can add ontology and implementation bindings without rewriting the
human-approved business intent.

The gate treats business context as a first-class contract. A command journey must carry, locate or
receive a named record such as `selectedProject`; it must never make a future page ask for a raw id.
Every `businessObject` is normalized once into a stable PascalCase identifier and that exact id is
consumed by the E4 entity/projection contract; localized display text stays in descriptions and titles.
The `required` flag has one shared meaning across E2 and E4: required entry contexts are guaranteed,
must have a direct-entry lookup when applicable and require ontology realization; optional handoffs
may enrich a flow but are not unconditional prerequisites and do not force an otherwise unused entity.
Cross-journey handoffs are also checked: a prerequisite may only provide a context actually exported
by the referenced journey, using the same stable `contextId`. Every `contextOrLookup` journey must
materialize its direct-entry fallback through a `locate` step.

The first deterministic gate failure in each proposal cycle does not immediately terminate the task.
E2 stores the rejected draft and creates one bounded structural repair carrying the exact gate
diagnostics. The repair step is added before the current step is completed so parent auto-completion
cannot close the task. A second structural failure in that cycle is terminal and remains persisted in
both the task trace and pipeline.

Internal consistency is insufficient for product completeness, so the coverage judge independently
checks E1 actors, explicit capabilities, screen intents, outcomes, recipient-side consumption and
human-selectable references. Blocking omissions receive one separate complete-draft semantic repair;
a prior structural repair does not consume this budget. The semantic repair returns through the
structural gate, is judged again and fails closed if incomplete. An invalid judge envelope is retried
once; compact verdict results remain in the task for diagnosis. Every generated plan id includes its
repair cycle, preventing duplicate-step collisions. `/fast` skips only the human widget, never the
structural gate or coverage judge.

Local smoke testing can validate and materialize an approved E1 folder without the Studio runtime:

```text
tsx --import test/register-hooks.mjs --import test/setup-l2.ts \
  mls-102020/l2/agentNewSolution4/steps/e2/nodejsSmoke.ts \
  <absolute-l4-module-dir> <absolute-e2-review.json> [--write|--verify]
```

The command defaults to dry-run. `--write` refuses to overwrite an already approved E2; `--verify`
recomputes every business hash and compares the written permanent business blocks with the review.

Live testing can call the same `collab-llm` alias declared in `prompt.md`, run the real gate and reuse
the smoke writer:

```text
tsx --import test/register-hooks.mjs --import test/setup-l2.ts \
  mls-102020/l2/agentNewSolution4/steps/e2/nodejsLiveE2.ts \
  <project> <module> [--write] [--approve]
```

Without flags it calls the LLM and validates without writing. `--write` saves
`pipeline/e2-live-review.json` and `pipeline/e2-live-llm-response.json` but does not change the pipeline.
`--approve` additionally invokes the guarded smoke writer and therefore refuses an already approved E2.
`--judge-existing` performs a read-only coverage judgment of the module's existing
`pipeline/e2-journeys.draft.json`; it never rewrites or approves the run.
