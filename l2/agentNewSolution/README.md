# agentNewSolution

L4 product compiler with E1 through E6 implemented and the complete build roadmap visible from the
start of the task.

`types.ts` is the stable public type facade for all implemented permanent E1–E6 contracts. Every
generated `module`, journey/index, access matrix, ontology entity/index, rule and composition `.defs.ts`
imports its matching type and is emitted as `as const satisfies <ArtifactType>`. Persistence writers
also accept only the matching artifact type, so a wrong writer/type pairing fails while compiling the
agent and a malformed emitted literal fails when L4 is typechecked by the project build. Each defs
also exports its exact `typeof` contract, preserving module-specific literal unions such as lifecycle
states for consumers without copied strings. Pipeline and
review JSON remain runtime-gated compiler state rather than TypeScript modules.

Invocation:

- `@@newSolution petShop` — create a module or resume its next incomplete v19 step;
- `@@newSolution petShop /fast` — auto-accept valid E1 through E6 proposals;
- `@@newSolution petShop /rebuild` — regenerate the module WHOLE: archives `l4/petShop` and
  `l5/petShop` through the platform soft-delete and generates again from E1. The whole folder on
  purpose — a previous run leaves drafts, pipeline traces and per-entity defs named after ITS
  ontology, and keeping any of them mixes two generations. `l2` is not touched: it belongs to
  agentChangeFrontend, which has its own rebuild;
- `@@newSolution petShop /rebuild e10` — regenerate FROM a step (e2..e10): e1..e9 keep their
  approval and timestamps, e10 runs again. Use it to re-emit only the l5 contracts without paying
  E1-E9. Both forms stamp `rebuiltFrom`/`rebuiltAt` on the pipeline;
- an existing module without an `agentNewSolution` pipeline is rejected.

For a one-token module invocation, lookup is canonicalized before the root planner. For example,
`@@newSolution BuildFlowFsm23 /fast` resumes the existing `buildFlowFsm23` module without creating
a fresh E1 clarification tree.

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
actor outcomes, recipient journeys and business-context acquisition. Structural repair and the single
semantic repair have independent budgets. Stable semantic remainders become visible system decisions
using the generated behavior as the default, then every structurally valid draft opens the journey
widget without failing the task. `🔎` identifies the automated judge and `👤` identifies the subsequent
human checkpoint. If a run is interrupted between steps, the same command resumes from the pipeline.
Approval writes:

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
fan-out then generates fields, constraints and rule-id references per entity with `maxParallel: 20`; each child
receives only its related journeys, authorities and relationships. A deterministic finalizer retries
only missing/invalid entities once and reassembles the complete contract. A compact relationship-binding
pass then maps every semantic edge to exact existing `fieldId` values, or explicitly records an
MDM/derived edge without a foreign key, with one bounded repair. The full gate runs before the single
human widget is opened. Every entity receives an explicit persistence
destination: organization MDM for stable base registrations, module database for transactions, or
derived/external/embedded for concepts without their own module table. The widget presents a colored
persistence map before the entity details, highlights cross-store relationships, keeps safe
title/description edits next to the selected entity and routes structural changes through a separate
prompt panel. Static field constraints are backend-required validation contracts mirrored by the
frontend. The overview freezes named lifecycle meanings needed by rules—such as unfinished, active,
applicable or billable—as exact predicate-to-state mappings instead of letting E5 or parallel workers
guess them. Dynamic and
time-relative conditions are deferred to E5 business rules.
E1 can already preserve a modernization strategy, but E4 deliberately fails closed for those modes
until legacy schema/file intake is implemented; it never silently replaces that strategy with a new database.
Approval writes:

- `l4/<module>/ontology/<EntityId>.defs.ts` — one complete, human-readable contract per entity;
- `l4/<module>/ontology/index.defs.ts` — relationship graph with exact endpoint fields, compact
  persistence routing, discovery references and frozen hash;
- updated module and pipeline status with `e5-rules` as the next step.

E3, E4 and E5 share the same approved-source loader. Recovery reads the permanent journey index and
journey defs, access-matrix def, and ontology index/entity defs; the large pipeline drafts are review
work products, not resume dependencies after approval. Before E4 approval, a failed post-fan-out run
may resume directly at relationship binding only when its overview and every entity draft are present
and pass all current deterministic gates again; otherwise E4 regenerates normally. E4 repair workers
load only their own previous entity def.

E5 reconstructs its input from the approved permanent journey, access and ontology artifacts. Those
artifacts reference business rules only through stable lower-camel ids in `useRules`; they never copy
the description. E5 mechanically collects those ids and makes one reasoning call with compact L4
context. Its output is deliberately small: one `id` and one precise, human-readable `description`
for each business rule. A deterministic gate guarantees that every id referenced by E2–E4 exists,
rejects invalid or duplicate ids and allows one bounded repair. There is no rule fan-out, executable
policy object or independent semantic judge. Approval writes:

- `l4/<module>/rules/rules.defs.ts` — the single permanent source of truth for all module rules;
- `l4/<module>/pipeline/e5-rules-approved.json` — the approved maintenance snapshot;
- updated module and pipeline status with `e6-behaviors` as the next step.

Future pages, use cases, tables and behaviors scan the complete L4 and attach only `useRules` ids.
Changing a rule therefore changes its meaning in one place, while impact analysis is the set of L4
artifacts that reference that id.

E6 is the sixth and final human clarification. It performs one conservative review of the approved
L4 and asks whether realization actually needs an additional horizontal business module or an
external plugin. Platform baseline capabilities are excluded, speculative architecture is omitted,
and an empty recommendation list is a valid positive outcome. The screen is intentionally small:
summary, recommendations, approve, request another proposal, or cancel. Approval writes:

- `l4/<module>/composition/additional-capabilities.defs.ts` — permanent composition decision;
- `l4/<module>/pipeline/e6-composition-approved.json` — approved maintenance snapshot;
- updated module and pipeline status with `e7-realization` as the next step.

The runtime keeps the historical `e6-behaviors` plan id as a stable internal identifier. The generated
contract uses the clearer composition terminology. Older flow versions are rejected rather than migrated.

E7 runs automatically after E6. It groups repeated journey steps into reusable channel-neutral use
cases, details them through a `maxParallel: 20` fan-out, applies deterministic gates and one targeted
repair round, and derives lifecycle workflows. It writes:

- `l4/<module>/usecases/<useCaseId>.defs.ts` plus `usecases/index.defs.ts`;
- `l4/<module>/workflows/<workflowId>.defs.ts` plus `workflows/index.defs.ts`;
- compiled context/use-case references in journeys and use-case authority references in the access matrix;
- updated module and pipeline status with `e8-workspaces` as the next step.

The journey `business` block and its hash remain unchanged. Use cases describe reusable business
behavior and exact ontology/rule references. They do not prescribe actors, authorization, pages, routes,
ports, repositories or a backend architecture; E3 and E8 retain those separate responsibilities.

E8 through E10 are automatic. E8 freezes the gated workspace skeleton and dispatches the bounded
workspace-detail fan-out without a clarification. E9 compiles navigation and page context, and E10
validates the complete L4 graph, writes the additive L5 delivery contracts and records `e10-result`.
There is no E8 workspace-review widget or E10 final-approval widget.

A limited E3 grant such as “client may see the published budget summary without seeing the Project
record” must be represented by an E4 projection or traceable information entity. Relationships preserve
selected journey context so later screens do not ask humans to type foreign-key ids.

`/fast` auto-approves E1 through E6 proposals through the same durable answer/result contracts used
by the interactive flow. E2 still passes its independent coverage judge, and E5 passes its deterministic
reference gate, in fast mode. Without
`/fast`, neither the E1 compile nor permanent E2 journeys can proceed before the respective checkpoint
is approved.

The flow contract lives in `docs/flow.json`. Canonical agent-engine guidance lives in
`mls-base/skills/collab_messages.md`, `agentsBestPractices.md` and `modelTypes.md`.

Terminal failures always carry a `traceMsg` in the task. Once a module pipeline exists, the same
failure is also stored as `status: failed`, `error` and `failedAt` in the corresponding E1–E10 state.
Errors returned by clarification callbacks remain recoverable and visible in the open widget; they do
not convert the review into a terminal failed step. Terminal cancellation remains unavailable until
`collab-messages` exposes an explicit cancelled/aborted lifecycle state.
