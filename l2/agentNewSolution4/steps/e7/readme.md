# E7 — realization

E7 is an automated compiler after the sixth and final product-design clarification. It groups identical journey step
ids into stable N→1 use cases, details each use case with a `parallel_dynamic` reasoning worker, runs a
deterministic targeted repair for invalid drafts, derives lifecycle workflows and emits permanent typed
L4 contracts.
Each worker uses the strict internal `{type:"flexible",result:{…}}` envelope, avoiding a temporary
failure state when its artifact is healthy.

Each use case keeps only its description, E2 context ids, E4 entity refs, behavior-owned E5 rule ids
and references to real lifecycle transitions. E8 owns operation inputs/outputs; backend generators derive
field access and persistence from the ontology instead of receiving read/write instructions from E7.
Actors, authorities, data scopes, errors, endpoint access patterns, ports and transaction policies stay
with their actual owners. Old drafts are rejected by version; a resume reuses only minimal V3 drafts.

Full transitions have one owner in workflow artifacts; use cases and journeys store only transition ids.
Global provenance and generation metadata live in indexes, not in every artifact. The step never edits journey `business` and verifies its `businessHash`. It writes only realization
metadata back to journey/access contracts. E3 realization derives authority links from journey-step refs;
E8 operations are the future channel integration endpoints, and backend generators choose their architecture.

Workflow compilation starts from the explicit E4 lifecycle but emits a partial workflow containing
only states operated by approved journey use cases. Unoperated intermediate states are removed from
that workflow only, recorded as `shrinkLifecycle` system decisions with `operateState` alternatives,
and do not alter the approved E4 ontology or open a mandatory clarification. Binary inactivation or
reversal flags still do not require a workflow. The deterministic gate remains terminal for broken
entity/use-case references, invalid transition bounds/operators and other structural defects.
