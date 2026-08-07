# E4 changelog

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
