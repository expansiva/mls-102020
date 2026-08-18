# E2 — permanent business journeys

E2 turns the approved E1 module contract into permanent, human-approved business journeys.

Policy choices are part of this contract. The generator attaches zero or more explicit
`policyDecisions` to each journey, without impact; the independent judge alone supplies impact and
related-journey context. The widget emits structured selections rather than hiding them in free text.
Selecting an alternative writes the current `draft.v{N}.json`, starts a complete next-round rewrite,
and the honor gate requires the rewritten decision to choose that alternative. Approval writes every
generated/selected pair to the journey index and emits `pipeline/e2-impact-report.json`; changed,
new or removed journeys mark their E3/E4/E5/E7 derived pipeline states stale. The same report records
the complete module histogram for `locate`, `inspect`, `act`, `decide` and `handoff` steps.

Before approval it writes only `l4/{module}/pipeline/e2-journeys.draft.json`. A deterministic gate
first validates internal structure and context flow. An independent `🔎` reasoning-model judge then
compares the complete E1 contract with the draft. It may request one semantic repair. A stable
remaining business bifurcation is recorded as a system decision using the behavior already implicit
in the generated draft; it does not fail E2. Every structurally valid proposal then reaches the `👤`
checkpoint in interactive mode, where assumed decisions are read-only and the user may approve or ask
for a change. `/fast` persists those same generated choices and system decisions automatically after
the gate and coverage judge, without creating the widget. A change request starts another generation
round using the previous draft as context.

After the structural gate, code computes the whole-module step-kind histogram. The only active
aggregate signal is `moduleWithoutDecide`: `decide == 0` is sent to the existing judge together with
the original request. The judge must turn that fact into one business-language question tied to an
existing journey. The existing single semantic repair may add a justified `decide` step or explicitly
sustain the current behavior with an empty patch. If the signal remains, it becomes a normal
`policyDecision` in that journey, so the checkpoint shows the current choice and its alternatives.
It never becomes a blocking gate.

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

E2 declares no context graph. A step is `{stepId, kind, entity, title, description, featureRefs}`
plus `targetProfile` on a handoff, and every context is derived downstream by
`helpers/ns4Context.ts` from that entity, the step kind, the order of the steps and the approved
ontology. The gate is therefore structural only: identity, kind, a stable PascalCase `entity`,
business-facing text that never asks for a raw id, feature references, the ordering of a preferred
origin journey and the `locate` fallback of a `contextOrLookup` journey. Every `entity` is
normalized once into a stable PascalCase identifier and that exact id is consumed by the E4
entity/projection contract; localized display text stays in titles and descriptions.

The first deterministic gate failure in each proposal cycle does not immediately terminate the task.
E2 stores the rejected draft and creates one bounded structural repair carrying the exact gate
diagnostics. The repair step is added before the current step is completed so parent auto-completion
cannot close the task. A second structural failure in that cycle is terminal and remains persisted in
both the task trace and pipeline.

Internal consistency is insufficient for product completeness, so the coverage judge independently
checks E1 actors, explicit capabilities, screen intents, outcomes, recipient-side consumption and
human-selectable references. Blocking omissions receive one separate complete-draft semantic repair;
a prior structural repair does not consume this budget. The semantic repair returns through the
structural gate and is judged again; remaining business findings are recorded without failing the run.
An invalid judge envelope is retried once. When decision coverage itself cannot be evaluated after
that retry, E2 records a system decision and proceeds to the normal checkpoint. Compact verdict
results remain in the task for diagnosis. Every generated plan id includes its
repair cycle, preventing duplicate-step collisions. `/fast` skips only the human widget, never the
structural gate or coverage judge.

Local smoke testing can validate and materialize an approved E1 folder without the Studio runtime:

```text
tsx --import test/register-hooks.mjs --import test/setup-l2.ts \
  mls-102020/l2/agentNewSolution/steps/e2/nodejsSmoke.ts \
  <absolute-l4-module-dir> <absolute-e2-review.json> [--write|--verify]
```

The command defaults to dry-run. `--write` refuses to overwrite an already approved E2; `--verify`
recomputes every business hash and compares the written permanent business blocks with the review.

Live testing can call the same `collab-llm` alias declared in `prompt.md`, run the real gate and reuse
the smoke writer:

```text
tsx --import test/register-hooks.mjs --import test/setup-l2.ts \
  mls-102020/l2/agentNewSolution/steps/e2/nodejsLiveE2.ts \
  <project> <module> [--write] [--approve]
```

Without flags it calls the LLM and validates without writing. `--write` saves
`pipeline/e2-live-review.json` and `pipeline/e2-live-llm-response.json` but does not change the pipeline.
`--approve` additionally invokes the guarded smoke writer and therefore refuses an already approved E2.
`--judge-existing` performs a read-only coverage judgment of the module's existing
`pipeline/e2-journeys.draft.json`; it never rewrites or approves the run.
