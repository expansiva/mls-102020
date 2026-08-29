<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e4/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E4 — ontology overview for a new solution

Create the frozen cross-entity plan for the business ontology. This first pass intentionally does not
generate fields or rule references: a parallel pass will detail each approved entity. It does freeze named
lifecycle predicates because they are business meanings shared by rules and entity workers. Write human-facing
text in the user's language. This run is `solutionMode: new`; never claim discovery of legacy schema.

{{platformSkill}}

## Sources and connected-system contract

- Cover every E2 journey, every `now` feature and every E3 authority with `informationNeeds` through
  entity `sourceRefs`. References must use exact E2/E3 ids.
- Model durable business nouns and useful read projections, never pages, forms, menus, commands or
  journey actions.
- Every E2 `steps[].entity` must have an entity or projection with that exact `entityId`; the journey
  step entities are L4 contracts, not optional examples.
- Relationships are how coordination is compiled: a step that operates a record additionally requires
  every parent reached by a `required` `manyToOne`/`oneToOne` relationship, so declare those exactly.
- Freeze every entity id, kind, ownership, optional `cardinality`, lifecycle, source references and persistence decision here.
- For every entity with lifecycle states, declare the single state in which a record is born as `initialState` and every state that ends its lifecycle as `terminalStates`; use only declared lifecycle state ids and never infer either meaning from the order of the list or from missing transitions.
- Lifecycle states and every other closed-domain value (`initialState`, `terminalStates`, enum constraint values) are **stable English codes**: lowerCamel ASCII, no accent, no space, no hyphen (`active`, `inactive`, `cancelled`, `monday`). They are identifiers, not user-facing text. Never write them in the user's language (`ativo`, `vigente`, `segunda-feira`). Titles and descriptions stay in the user's language — that is what is translated.
- Next to `lifecycleStates`, emit `lifecycleLabels` as an array of `{ "code", "label" }` objects — one per state, `code` equal to the state id, `label` in the user's language (`userLanguage`, default `en`). Example: `{ "code": "active", "label": "Ativo" }`. Do not put the label in the state id.
- Freeze every relationship here. Relationships must carry journey context: when a journey selects a
  Project and later creates an order, usage, time log or invoice, the graph must make that selected
  Project available. A future UI must never ask a human to type a raw foreign-key id supplied by an
  approved journey.
- Keep the graph connected. Limited client information is a projection, not full underlying access.
- Make downstream rules implementable. Every durable fact explicitly required by E2 journeys, E3
  access contracts or their rule ids must have an owned field, lifecycle meaning, relationship, calculation input,
  identity association, exception/authorization record or projection. Do not defer missing business
  data to an implementation guess in E5. When a source uses a named subset of lifecycle states such
  as unfinished, active, applicable, billable, eligible or open, the entity detail must define an
  explicit lifecycle predicate mapping that meaning to exact states.

## Persistence and MDM

Declare `party` for EVERY entity: `person` when it is a natural person, `organization` when it is a
company or institution, `none` for anything else. It is not a label — it decides the storage:

- **Every party is MDM.** A client, a worker, a supplier, a contact, a carrier, a coordinator: `party` is
  `person` or `organization`, so `kind` is `mdm`, `ownership` `moduleOwned`, scope `organization`, with
  `mdmType`. The record belongs to the organization and is reused across modules — a CRM built later reads
  the same registry. There is no exception for "this person also uses the platform".
- **A login is never duplicated.** When the party also signs in, the MDM record carries an external
  reference FIELD (`platformUserId`, a required uuid whose description says it points at the platform
  directory). The person lives in MDM; the login is an attribute of the person. Do NOT model the platform
  user as an entity of its own, and never use `ownership: external` for a person or an organization.

Choose exactly one `storage.target` per entity:

- `mdm`: stable organization registrations reused by transactions and reports—clients, projects,
  regions, service/material catalogs and units. Use kind `mdm`, ownership `moduleOwned`, scope
  `organization`, required uuid `idField`, and `mdmType` exactly `<moduleName>.<EntityId>`.
- `moduleDatabase`: transactional/operational records—orders, executions, time logs, invoices,
  movements and decisions. Use scope `module` and a uuid `idField`.
- `derived`: calculated projection, kind `projection`, ownership `derived`, scope `none`.
- `external`: platform/plugin-owned reference, ownership `external`, scope `platform`.
- `embedded`: value object, kind `valueObject`, scope `none`.

Separate master data from operational state. Material may be MDM; inventory, adjustment and usage are
transactions. Never put balances, accumulated totals or transaction history into MDM. Keep platform
user ids as external references rather than duplicating users. Explain each decision in `storage.notes`.
`kind: core` with `ownership: external` is rejected: it is not a defined combination.

Relationship persistence modes are `mdmRelationship`, `moduleReference`, `crossStoreReference`,
`derivedJoin`, `externalReference` and `embedded`. Entity ids are PascalCase nouns; relationship ids
are lowerCamel. Relationships may be `oneToOne`, `oneToMany`, `manyToOne` or `manyToMany`.

## Cardinality

Declare `cardinality: "singleton"` only when the module has **one fixed, known instance** of the
entity (the campaign, the page, the module's own configuration). The request names it in the definite
singular and **no journey creates further instances**.

- Yes: the petition of a signature campaign (`Petition` in listaAssinatura) — one published text,
  seeded, never a catalogue of petitions.
- No: Task, Pet, Order — collections. Users create more records; omit the field.

When in doubt, **omit the field**. A false singleton hides a needed catalogue; a false plural only
keeps today's behaviour. Never emit any other cardinality value.

## Adjustment and repair

When a previous complete review and a human request are supplied, preserve its valid decisions and
direct human edits unless the request requires changing them. Gate feedback is mandatory to repair.
Return a complete replacement overview. `changeSummary` lists material differences only.

The request may be an E5 upstream-contract report. Resolve every ontology/data-related gap explicitly,
including actor-to-business-record mappings, cost inputs, lifecycle predicates, required-work meaning,
exception records and durable allocation links when cited. Access-only gaps remain owned by E3. Do not
remove unrelated entities, fields or relationships from the previous approved review.

## Output

Return exactly one JSON object without Markdown. Do not include `fields` or `useRules`. The values
below illustrate the JSON shape only; never copy their lifecycle states or predicate unless supplied
sources establish that same meaning.

{
  "planId": "e4-ontology-plan",
  "moduleName": "lowerCamelModule",
  "userLanguage": "en",
  "title": "Business ontology",
  "reviewRound": 1,
  "solutionMode": "new",
  "businessDomain": "Construction and remodeling operations",
  "entities": [{
    "entityId": "Project",
    "title": "Project",
    "description": "An engagement carrying client, scope, schedule and cost context.",
    "kind": "mdm",
    "ownership": "moduleOwned",
    "sourceRefs": {
      "journeyIds": ["registerProject"],
      "featureIds": ["projectRegistration"],
      "authorityRefs": ["buildflow:projectsetup"]
    },
    "lifecycleStates": ["planned", "active", "completed", "cancelled"],
    "lifecycleLabels": [
      { "code": "planned", "label": "Planned" },
      { "code": "active", "label": "Active" },
      { "code": "completed", "label": "Completed" },
      { "code": "cancelled", "label": "Cancelled" }
    ],
    "initialState": "planned",
    "terminalStates": ["completed", "cancelled"],
    "lifecyclePredicates": [{
      "predicateId": "ongoingProject",
      "description": "A project is ongoing while planned or active.",
      "stateIds": ["planned", "active"],
      "source": "journey"
    }],
    "storage": {
      "target": "mdm",
      "scope": "organization",
      "idField": "projectId",
      "mdmType": "lowerCamelModule.Project",
      "notes": "Organization master reused by transactions and reporting."
    }
  }],
  "relationships": [{
    "relationshipId": "projectBelongsToClient",
    "fromEntity": "Project",
    "toEntity": "Client",
    "type": "manyToOne",
    "required": true,
    "description": "Each project belongs to one client.",
    "persistence": { "mode": "mdmRelationship" }
  }],
  "changeSummary": ["Initial ontology overview."]
}
