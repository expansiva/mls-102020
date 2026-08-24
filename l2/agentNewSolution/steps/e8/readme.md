# E8 — Workspaces

E8 derives the workspace skeleton mechanically from approved E2–E7 artifacts. After the presentation
and skeleton gates pass, the compiler dispatches the parallel workers automatically; workers only add
field-level organisms and command input sources. Permanent output is `workspaces/<workspaceId>.defs.ts` and `workspaces/index.defs.ts`; every
finalizer round also writes the diagnostic history to `pipeline/e8-validation-report.json`.
Candidate context edges come from adjacent steps of one journey, from the `preferredFromJourneyRef`
origin of a journey and from a handoff reaching the event-driven journey of its `targetProfile`.
Every edge carries derived entity contexts, so no edge depends on a name the generator chose.
Workspace-detail workers submit the strict internal `{type:"flexible",result:{…}}` envelope to avoid
provisional failed status for healthy artifacts.
Before dispatch, the hook checks the flattened task tree for the stable detail `planId`, so a repeated
or late after-prompt callback cannot enqueue another fan-out/finalizer pair for the same round.

Workspace `pageContext` contains only the hub anchor and contexts carried by a real notification or
handoff edge. Other required contexts stay in `scenario.selectionContexts` and resolve through a slice,
form input, actor session or the unique scenario target. The strict L1 call is presentation-only. An
invalid presentation gets one constrained repair and then keeps the mechanical defaults, so presentation
variance never blocks the run. E8 preview and E9 compilation both use the total `helpers/routeOf.ts`.

The gate rejects unhosted use cases, empty workspaces, unresolved page context, unbounded menu
sections, invalid queues, skeleton drift and invented fields. Until E3 binds its business-language
`allowedInformation` to ontology field refs, `fieldsOnly` projections are recorder warnings and
durable system decisions; the backend remains responsible for enforcing the E3 projection.
A review or a form backed by a command with declared `contexts.requires` still needs a frozen slice,
workspace path or scenario context. A recognized context-free command, including a cold-start creation, may render a
form from user-entered values; E8 does not invent a pre-existing record solely to satisfy the gate.

## Master data is deactivated, never deleted

A record catalogue synthesizes five operations from the ontology: `list`, `getById` (`get{Entity}` /
`qryGet{Entity}`), `create`, `update`, and `delete` (or `inactivate`/`reactivate` when
`storage.target` is `mdm`). `getById` is emitted even when no page consumes it.

A record catalogue of an entity whose `storage.target` is `mdm` emits `inactivate`/`reactivate`
instead of `delete`, and its list returns only active records unless the caller passes the optional
`includeInactive` request flag. A lookup by id still resolves an inactive record, so history stays
readable. The situation flag is derived from the MDM record lifecycle: the ontology declares no
`active` field and the model declares the derived response member in the operation's `mdm` block.

The lifecycle pair keeps `accessPattern.kind: 'update'` because the consumer's accessPattern
vocabulary is a closed set; the meaning travels in `mdm.lifecycle`. `NS4_E8_MDM_DELETE` is the
deterministic backstop for a delete over master data arriving from any other path.
