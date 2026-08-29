# E4 changelog

- 2026-08-29: On-demand artifacts (`*Export`, `*Report`, `*Receipt`, `*Snapshot`, `*Csv`, `*File`,
  and their `*Item` companions) stored as `moduleDatabase` are `NS4_E4_DERIVED_PERSISTED` unless
  the E1 request explicitly asks to keep history/audit/versioning/reprocessing of that artifact.
  When in doubt, `derived`. Ontology notes are not the request. Prompt says so; the gate classifies
  each name before accusing and names the legitimate path.

- 2026-08-29: Overview may declare `cardinality: 'singleton'` on an entity with one fixed instance
  (the campaign, the page). Optional in the type and in `e4-review.schema.json` (absence = today).
  The prompt says when in doubt omit the field. Gate `NS4_E4_SINGLETON_CREATE` rejects a singleton
  whose E2 journey still creates records of that entity (`deriveNs4Contexts.creates`). E8 already
  skips the record catalogue when the field is present.

- 2026-08-26: `smart` skips the ontology widget when the only recorded decisions are Type C label
  backfills (or none) and writes `autoReason: nenhum finding A` next to `approvedBy=auto`. `/fast`
  and `automatic` still skip. A Type A finding would reopen the widget.

- 2026-08-26: The post-gate auto-approval also honors E1 `reviewPolicy.mode=automatic` through
  `helpers/ns4ReviewPolicy.ts`. `/fast` is unchanged.

- 2026-08-24: Non-lifecycle enum fields (`priority`, …) were omitted by the entity worker even
  though `enumLabels` was in the prompt: the JSON example showed only a uuid field, the schema
  leaves the array optional, and the gate treats absence as valid. The entity example now includes
  a labelled enum; a Type C backfill fills any remaining gap with a humanized code
  (`inProgress` → `In progress`) and a non-blocking `systemDecision`. Status stays on
  `lifecycleLabels` (not duplicated as field `enumLabels`). The gate still does not fail a run for
  missing labels — old L4 without the field keeps compiling.

- 2026-08-24: Closed-domain values carry an optional `enumLabels` / `lifecycleLabels` array of
  `{ code, label }` (user-language text next to the English code). The tool schema stays
  `additionalProperties: false` — a Record map is inexpressible. Absence is valid (old L4). The
  gate checks orphan/duplicate codes and does not run `NS4_E4_ENUM_CODE_EN` on the label.

- 2026-08-24: Closed-domain values (lifecycle states, `initialState`, `terminalStates`, field enums)
  are stable English codes (`active`, `monday`), not user-language text. The overview and entity
  prompts say so; the gate rejects anything else (`NS4_E4_ENUM_CODE_EN`). Titles and descriptions
  stay in the user's language. Motivated by petShop run08: seeds died after repair translated
  `ativo` → `Active` because the canonical value was Portuguese.

- 2026-08-18 (party policy,: every entity now declares
  `party: 'person' | 'organization' | 'none'`, and the gate makes the storage decision mechanical instead
  of a prompt the model may skip: `party !== 'none'` must use `storage.target: 'mdm'`
  (`NS4_E4_PARTY_STORAGE`), an undeclared or out-of-vocabulary party is named
  (`NS4_E4_PARTY_MISSING`), and `kind: 'core'` with `ownership: 'external'` is rejected
  (`NS4_E4_OWNERSHIP_EXTERNAL_CORE`) — the combination the policy never defined and exactly what
  FieldWorker used before the backend materialized a seeded local table of PEOPLE. A login is a
  `platformUserId` external-reference FIELD on the MDM record, never an entity. `party` is required by
  the gate but OPTIONAL in the artifact type, so the L4 already generated (schema v6, no `party`) keeps
  compiling — nothing is ever migrated.

  **OPEN DECISION for the supervisor (item 3 of that spec, deliberately not taken here): the `mdmType`
  taxonomy.** Today it is `<moduleName>.<EntityId>`, scoped to the module. For the CRM goal — a contact
  registered by one module and reused by another — the alternatives are canonical organization types
  (`org.Person`, `org.Organization`, or `org.Client`/`org.Worker`) versus keeping the module-scoped type
  plus a catalogue of equivalences. Canonical gives reuse immediately but needs governance of a shared
  schema; module-scoped keeps autonomy and defers unification. Two facts from the backend side
 belong in this decision: 102034's `MdmSubtype` is a CLOSED
  union of 13 values, so every MDM entity has to map onto one of them and a construction project has no
  natural subtype (the heuristic falls back to `Product`); and MDM writes have no per-module
  authorization, so shared master data written by several modules is a platform governance question, not
  a generator one.

- 2026-08-14: An enumerated field now carries its literal values in `fields[].enum`, and an entity
  with a lifecycle carries the same list in `statusEnum`. Both are derived in `normalizeEntity` from
  contracts that already existed — the `kind: 'enum'` constraint (JSON array, comma or pipe separated)
  and `lifecycleStates` — so no prompt, tool schema or gate changed. A status field with no constraint
  falls back to the lifecycle. The constraint stays as the human-readable rule; the union never
  replaces it. Consequence: `ontologyHash` changes, so a run started before this version reports
  source drift on resume instead of silently mixing shapes.

- 2026-08-12: Unwrap the platform tool-call transport before normalizing an entity worker result.
  Run 33 otherwise persisted every valid worker answer as an empty entity draft.

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
