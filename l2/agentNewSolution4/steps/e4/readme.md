# E4 — business ontology review

Inputs are the approved module contract, E2 journeys and E3 access matrix. Current-flow modules whose
E3 is approved resume this step with the explicit `new` solution mode; E4 never fabricates legacy
database evidence.

Each round first writes `pipeline/e4-ontology-plan.draft.json`, then details entities through a
`parallel_dynamic` fan-out with `maxParallel: 20` into `pipeline/e4-entities/{EntityId}.draft.json`.
The overview freezes lifecycle states and named predicate-to-state mappings before the workers run;
workers add fields, constraints and rule ids without redefining those meanings or duplicating rule descriptions.
The deterministic finalizer repairs only missing/invalid entities once. It then starts one compact
relationship-binding pass, which writes `pipeline/e4-relationship-bindings.draft.json` and maps every
semantic edge to exact existing endpoint fields or an explicit MDM/derived realization. Its gate rejects
invented fields, missing edges and incompatible persistence strategies and allows one localized repair.
Only then E4 assembles `pipeline/e4-ontology.draft.json` and renders the same single ontology widget. Titles
and descriptions can be edited directly. Structural requests first persist those edits, then add the
next open E4 round before completing the current clarification.

The gate requires coverage of all E2 journeys, all `now` features, every required carried/produced E2
`businessObject`, and every E3 authority carrying an information need. Required journey objects must
exist as an entity or projection with the same id. Entity and relationship references are closed, stored entities have identifiers,
lifecycle entities have status, lifecycle predicates contain only exact declared states, and persistent business entities form a connected graph. Persistence
is explicit and closed: `mdm` for organization master records, `moduleDatabase` for transactions,
`derived`, `external` or `embedded` for concepts without a module table. Kind, scope, idField and
mdmType must agree. Master data never carries mutable operational balances or transaction history.
The widget groups entities by this destination, marks relationships that cross stores and displays the
exact fields implementing every edge.

Static field constraints are shared frontend/backend validation contracts. Named lifecycle subsets
required by a journey or access rule are explicit reusable contracts—for example,
`unfinishedWorkTask = [notStarted, inProgress]`; E5 never infers them from prose. Dynamic, time-relative,
cross-entity, authorization, transition and calculation rules belong to E5.
Aggregate projections may stand alone; a projection carrying `projectId` must still declare its
relationship to Project so later navigation receives selected context instead of a typed id.

The first gate failure persists the invalid draft and creates one bounded repair step carrying exact
gate feedback. A second failure is terminal and remains recorded in both task trace and pipeline.

Approval freezes one shared ontology hash and writes one defs file per entity plus
`ontology/index.defs.ts`, whose compact entity entries include persistence routing, then unlocks the
implemented E5 rules compiler.
