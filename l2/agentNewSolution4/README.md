# agentNewSolution4

L4 product compiler with E1 through E5 implemented and the complete build roadmap visible from the
start of the task.

Invocation:

- `@@newSolution4 petShop` — create a module or resume its next incomplete v11 step;
- `@@newSolution4 petShop /fast` — auto-accept valid E1 through E5 proposals;
- an existing module without an `agentNewSolution4` pipeline is rejected.

The root planner reads the prompt language, validates the request and translates the friendly titles
for E1 through E10. It creates the complete dependency graph before E1 starts, so the user can see what
will be delivered next. The titles and detected language are persisted in both permanent artifacts;
the orchestration does not translate or infer them again in later steps.

The six E1-through-E6 roadmap checkpoints receive one deterministic `👤` prefix each. Technical
repair, judge, fan-out, finalizer and dynamically appended clarification nodes do not duplicate that
human marker. The localized titles stored in L4 remain plain text, so presentation markers never
contaminate the permanent product contract.

E1 writes:

- `l4/<module>/module.defs.ts` — partial permanent module contract;
- `l4/<module>/pipeline/pipeline.json` — resumable build state.

E1 is split into two dependency-driven steps. `e1-clarification` owns the LLM proposal and widget,
preserves the complete reviewed intake contract and supports repeated prompt-driven revisions.
`e1-compile` is unlocked only after the rich deterministic gate accepts identity, strategy, scope,
languages and constraints.

After E1 approval, the already-planned E2 step is unlocked automatically. E2 writes a review draft,
passes it through the deterministic structural gate and then through an independent semantic coverage
judge. The judge compares the complete E1 contract with the proposed journeys and blocks missing
actor outcomes, recipient journeys and business-context acquisition. Structural repair and semantic
coverage repair have independent bounded budgets; only a judged-complete draft opens the journey widget. `🔎` identifies the automated judge
and `👤` identifies the subsequent human checkpoint. If a run is interrupted between steps, the same
command resumes from the pipeline. Approval writes:

- `l4/<module>/journeys/<journeyId>.defs.ts` — permanent business source of truth;
- `l4/<module>/journeys/index.defs.ts` — journey/feature discovery index;
- updated module and pipeline status with `e3-access-matrix` as the next step.

E3 generates a separate collab-auth access matrix. Its widget shows profiles as columns and JWT
authorities as rows, with a detailed scope/disclosure contract for each granted cell. The user may
request another version by prompt any number of times; each request creates a new durable LLM round
and returns to the same widget. Approval writes:

- `l4/<module>/access/access-matrix.defs.ts` — permanent profiles, authorities, grants, data scopes
  and disclosure limits;
- updated module and pipeline status with `e4-ontology` as the next step.

E4 currently treats the module explicitly as a new solution. It combines approved journeys and access
information into a connected ontology checkpoint. Internally, one compact reasoning pass first freezes
entity identity, traceability, MDM/storage routing and relationships. A proven `parallel_dynamic`
fan-out then generates fields, constraints and invariants per entity with `maxParallel: 20`; each child
receives only its related journeys, authorities and relationships. A deterministic finalizer retries
only missing/invalid entities once, reassembles the complete contract and runs the full gate before the
single human widget is opened. Every entity receives an explicit persistence
destination: organization MDM for stable base registrations, module database for transactions, or
derived/external/embedded for concepts without their own module table. The widget presents a colored
persistence map before the entity details, highlights cross-store relationships, keeps safe
title/description edits next to the selected entity and routes structural changes through a separate
prompt panel. Static field constraints are backend-required validation contracts mirrored by the
frontend; dynamic and time-relative conditions are deferred to E5 business rules.
E1 can already preserve a modernization strategy, but E4 deliberately fails closed for those modes
until legacy schema/file intake is implemented; it never silently replaces that strategy with a new database.
Approval writes:

- `l4/<module>/ontology/<EntityId>.defs.ts` — one complete, human-readable contract per entity;
- `l4/<module>/ontology/index.defs.ts` — relationship graph, compact persistence routing, discovery
  references and frozen hash;
- updated module and pipeline status with `e5-rules` as the next step.

E5 first builds the exact source catalog and coverage bookkeeping mechanically. A compact reasoning
pass groups those sources into frozen rule plans, then a proven `parallel_dynamic` fan-out details one
rule per child with `maxParallel: 20` and filtered journey, access and ontology context. The deterministic
finalizer retries only missing or invalid rules once and reassembles the unchanged human review contract.
An independent judge then reads the compact catalog/context and complete rule draft to detect semantic
omissions, contradictions, wrong destinations, unenforceable wording, upstream contract gaps and
illustrative values accidentally turned into fixed policy. One bounded plan-plus-parallel semantic
repair is allowed. Approval writes:

- `l4/<module>/rules/<ruleId>.defs.ts` — one permanent contract per rule;
- `l4/<module>/rules/index.defs.ts` — compact discovery, routing, coverage and frozen hash;
- `l4/<module>/pipeline/e5-source-catalog.json` — mechanically extracted source inventory;
- `l4/<module>/pipeline/e5-rules-plan.draft.json` and `pipeline/e5-rules/<ruleId>.draft.json` — resumable compiler intermediates;
- `l4/<module>/pipeline/e5-rules.approved.json` — the approved maintenance snapshot;
- updated module and pipeline status with `e6-behaviors` as the next step.

A limited E3 grant such as “client may see the published budget summary without seeing the Project
record” must be represented by an E4 projection or traceable information entity. Relationships preserve
selected journey context so later screens do not ask humans to type foreign-key ids.

`/fast` auto-approves E1 through E5 proposals through the same durable answer/result contracts used
by the interactive flow. E2 and E5 still must pass their independent judges in fast mode. Without
`/fast`, neither the E1 compile nor permanent E2 journeys can proceed before the respective checkpoint
is approved.

The flow contract lives in `docs/flow.json`. Canonical agent-engine guidance lives in
`mls-base/skills/collab_messages.md`, `agentsBestPractices.md` and `modelTypes.md`.

Terminal failures always carry a `traceMsg` in the task. Once a module pipeline exists, the same
failure is also stored as `status: failed`, `error` and `failedAt` in the corresponding E1–E5 state.
Errors returned by clarification callbacks remain recoverable and visible in the open widget; they do
not convert the review into a terminal failed step. Terminal cancellation remains unavailable until
`collab-messages` exposes an explicit cancelled/aborted lifecycle state.
