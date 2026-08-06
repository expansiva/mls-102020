# E4 — business ontology review

Inputs are the approved module contract, E2 journeys and E3 access matrix. Existing v4 modules whose
E3 is approved resume this step with the explicit `new` solution mode; E4 never fabricates legacy
database evidence.

Every LLM round writes `pipeline/e4-ontology.draft.json` and renders the same ontology widget. Titles
and descriptions can be edited directly. Structural requests first persist those edits, then add the
next open E4 round before completing the current clarification.

The gate requires coverage of all E2 journeys, all `now` features and every E3 authority carrying an
information need. Entity and relationship references are closed, stored entities have identifiers,
lifecycle entities have status, and persistent business entities form a connected graph. Persistence
is explicit and closed: `mdm` for organization master records, `moduleDatabase` for transactions,
`derived`, `external` or `embedded` for concepts without a module table. Kind, scope, idField and
mdmType must agree. Master data never carries mutable operational balances or transaction history.
The widget groups entities by this destination and marks relationships that cross stores.

Static field constraints are shared frontend/backend validation contracts. Dynamic, time-relative,
cross-entity, authorization, transition and calculation rules belong to E5.
Aggregate projections may stand alone; a projection carrying `projectId` must still declare its
relationship to Project so later navigation receives selected context instead of a typed id.

The first gate failure persists the invalid draft and creates one bounded repair step carrying exact
gate feedback. A second failure is terminal and remains recorded in both task trace and pipeline.

Approval freezes one shared ontology hash and writes one defs file per entity plus
`ontology/index.defs.ts`, whose compact entity entries include persistence routing. E5 remains a
visible manual-later roadmap step until implemented.
