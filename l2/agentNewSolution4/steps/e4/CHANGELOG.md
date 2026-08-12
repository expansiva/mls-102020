# E4 changelog

- 2026-08-12: Entity fan-out now submits its artifact through a strict `flexible` tool envelope,
  preventing healthy workers from being provisionally coerced to `failed` before `afterPrompt`.

- 2026-08-11: Make lifecycle birth and completion explicit with `initialState` and optional `terminalStates`; the deterministic gate rejects unknown states and initial-terminal overlap.

- 2026-08-09: Build 40 declares `modelType: reasoning` and high reasoning effort on the new
  relationship-binding prompt. Run27 exposed that an unannotated prompt falls back to the inactive
  `cost` alias before any ontology payload is produced. A regression test now checks every E4 LLM
  prompt for an explicit active alias.
  A failed post-fan-out invocation can also resume directly at binding after mechanically revalidating
  the overview, every entity draft and the aggregate E4 contract; run27 therefore does not need to
  repeat its 22 successful entity calls.

- 2026-08-09: Build 39 / flow v19 adds a post-fan-out relationship-binding compiler pass. Every
  semantic edge now names exact existing endpoint fields or an explicit MDM/derived realization;
  deterministic validation rejects missing/unknown bindings and permits one focused repair before the
  ontology clarification. Ontology schema v5 freezes the resolved graph in the permanent index.

- 2026-08-08: Build 32 uses the same shared permanent journey/access readers as E3/E5. An ontology
  repair overview is reconstructed from its approved index/entity defs, while each parallel worker
  reads only its matching previous entity def instead of repeatedly loading the large E4 review draft.

- 2026-08-08: Build 31 routes an E5 upstream-contract failure through a new E3/E4 round on explicit
  resume. E4 preserves the approved review, receives the exact gap report in both overview and entity
  workers, and must add the missing durable rule facts before E5 retries. Reapproval records the new
  review round while stale callbacks still cannot regress an approved checkpoint.

- 2026-08-08: Flow v17 imports the shared E2 required-context selector instead of maintaining its
  own interpretation. Optional carried or produced context does not force an E4 entity; required
  context remains an exact entity/projection contract.

- 2026-08-08: Flow v16 receives canonical PascalCase journey `businessObject` ids from E2. This
  removes the impossible run21 overview-repair loop in which the E4 prompt correctly produced
  `ProjectPortfolio` while its gate compared the localized E2 label `Project portfolio` literally.

- 2026-08-08: Flow v15 makes dynamic dispatch symmetric across prompt callbacks. Run20 proved that
  all 25 entity LLM calls returned valid entity payloads, but collab-messages omitted hook `args` only
  on `afterPromptStep`; the root then parsed every entity as the initial roadmap. The shared dispatcher
  now prefers hook args and falls back to the selector retained in `step.prompt`, for both E4 and E5.

- 2026-08-08: Flow v12 reconstructs the E4 base invocation when a materialized parallel child carries
  only `args=entity:<Id>` and has neither `step.prompt` nor `planning`. Run17 had routed the children
  correctly but ended all 19 before their LLM calls because the internal E4 parser still read the
  absent prompt; the targeted repair repeated the same failure.
- 2026-08-07: Flow v11 dispatches materialized `parallel_dynamic` children by their stable `entity:`
  hook argument when `collab-messages` omits child `planning.planId`; run16 had failed all 19 children
  with `Unsupported implemented step: (missing)` before any entity detail LLM call.
- 2026-08-07: Flow v10 requires every required E2 journey business object to exist as an E4 entity or
  projection before entity fan-out, preventing a missing handoff contract from reaching E5.
- 2026-08-07: Flow v9 split the oversized ontology call into a compact overview plus one filtered
  per-entity call using the proven `parallel_dynamic` orchestration with `maxParallel: 20`. Added
  intermediate plan/entity drafts, gates before and after fan-out, one targeted entity repair round,
  deterministic aggregation and the unchanged single human ontology review.
- 2026-08-05: Versioned ontology v2 and flow v5; restored the stable-master-versus-transaction MDM
  policy from agentNewSolution, added structured persistence target/scope/idField/mdmType routing,
  compact routing in the ontology index, shared static field constraints, deterministic storage
  gates, and a persistence-map widget with cross-store relationship visibility.
- 2026-08-05: Added resumable greenfield ontology generation, deterministic journey/access coverage
  gate, direct description editing, a separate structural-change panel, iterative review rounds and
  permanent per-entity defs plus a relationship index; live run10 testing added endpoint normalization
  and one bounded gate-repair round for rare model omissions.
