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

A workspace is a place. A journey of the same actor on an entity the catalogue already shows is
hosted on that catalogue (`hostedStepRefs`) instead of becoming a second page. A hub is emitted only
when its closed catalogue has a `relatedList` or `projectionTile`. `NS4_E8_STEP_UNHOSTED` requires
every non-demoted journey step to be hosted somewhere; `NS4_E8_USECASE_UNHOSTED` is the same
completeness for every approved E7 use case of those journeys (a `bffCall` on some workspace,
including exclusive commands of an absorbed journey). `NS4_E8_REDUNDANT_WORKSPACE` is the inverse
(a leftover journey or a hub that only copies the anchor list). Scene grouping stays a CF concern.
When an external profile has a public-scope grant and a journey reads a singleton (locate/inspect),
E8 emits one `contentPage` (`categoryRef: contentLanding`) that quotes E1 prose into `type: content`
organisms and hosts the conversion steps of the same actors. A phrase in E1 is not the door. A
singleton core entity does not get a record catalogue. `NS4_E8_CONTENT_ORGANISM` rejects a content
organism outside a `contentPage`.

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

An `inspect` of entity X that comes **before** a `locate` of the same X is a collection summary
(counts of the listing), not getById of one row. E8 emits `accessPattern.kind: 'list'`, no identity
input, `outputKind: paginated`, organism `usage: 'summary'`. The five indicators (total, each
non-cancelled status, overdue) are derived on the screen from the loaded items. Overdue is
calendar day of `dueDate` before today and status ∉ {completed, cancelled, canceled} — not a field. A later
inspect of the same entity (after locate) stays getById. `NS4_E8_COLLECTION_INSPECT_GETBYID`
records a leftover getById on that path (registrar). Existing modules do not change without
regeneration.

The catalogue `list` also synthesizes optional listing controls from the ontology, because E6 has no
vocabulary for them (it is additional modules/plugins) and a journey step is not a catalogue: `search`
when the entity has `title` or `name`, `sortBy`/`sortOrder` when it has dates, `*At` timestamps or
closed enums, and always `page`/`pageSize` (numbers; default 20 / cap 200 live in the runtime). All
are optional `userInput`. `sortBy` is the closed enum of those field ids, not a free string. A
`filterControl` with `attachTo` the list query is added on `recordList` when search/sort exist.
`NS4_E8_LIST_WITHOUT_SEARCH` / `_SORT` record a leftover empty list (registrar). Every list declares
`pagination: optional`; `NS4_E8_LIST_WITHOUT_PAGINATION` is blocking.

A record catalogue of an entity whose `storage.target` is `mdm` emits `inactivate`/`reactivate`
instead of `delete`, and its list returns only active records unless the caller passes the optional
`includeInactive` request flag. A lookup by id still resolves an inactive record, so history stays
readable. The situation flag is derived from the MDM record lifecycle: the ontology declares no
`active` field and the model declares the derived response member in the operation's `mdm` block.

The lifecycle pair keeps `accessPattern.kind: 'update'` because the consumer's accessPattern
vocabulary is a closed set; the meaning travels in `mdm.lifecycle`. `NS4_E8_MDM_DELETE` is the
deterministic backstop for a delete over master data arriving from any other path.

## The record owner is the session, never a form field

An E3 grant with `dataScope.mode: 'own'` (and no other mode on that entity) binds the owner handle
(`ownerId` / `ownerUserId` / `customerId` / `clientId`) to the authenticated actor. Catalogue and
journey write inputs emit `source: 'actorSession'`. A person the actor actually chooses
(`assignedUserId`) stays `userInput`. `NS4_E8_USERINPUT_FROM_SESSION` records a leftover `userInput`
whose fieldRef or description still names the session — registrar, not a stop.
