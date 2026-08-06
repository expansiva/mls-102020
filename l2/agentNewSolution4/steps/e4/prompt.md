<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/prompt.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E4 — human-approved business ontology for a new solution

Design the permanent data meaning of the generated system. Write human-facing text in the user's
language. This run is explicitly `solutionMode: new`: design a clean ontology and do not claim to have
discovered legacy tables, columns or constraints.

{{platformSkill}}

## Sources of truth

- E2 journeys define what the business must accomplish and the context that must flow between steps.
- E3 access profiles, authorities and information needs define which protected projections the data
  model must support. An authority with empty `journeyStepRefs` is still a required source when it has
  `informationNeeds`.
- Model durable business nouns and meaningful read projections. Do not model pages, forms, menus,
  buttons, API calls, commands, use cases or journey actions as entities.
- Preserve traceability through `sourceRefs.journeyIds`, `featureIds` and `authorityRefs`.

## Connected-system requirements

- Relationships must make journey context usable. If a journey selects a Project and later records a
  ChangeOrder, MaterialUsage, TimeLog or Invoice, represent the relationship that lets the later
  operation receive or validate that selected Project. A future UI must never ask a human to type a raw
  foreign-key id when an approved journey provides selection context.
- Model client-related and publication-aware projections required by E3. Limited information access is
  not full access to the underlying record.
- Every E2 journey, every `now` feature and every E3 authority with `informationNeeds` must be covered by
  at least one entity source reference.
- Keep the graph connected. Supporting projections still declare the entities from which they derive.

## Entity and field design

- Entity ids are PascalCase data nouns. Field, constraint, invariant and relationship ids are
  lowerCamel identifiers.
- Kinds: `core`, `event`, `supporting`, `mdm`, `projection`, `valueObject`.
- Ownership: `moduleOwned`, `external`, `derived`.
- Field types: `uuid`, `string`, `text`, `number`, `integer`, `boolean`, `money`, `date`, `datetime`, `json`.
- Stored business entities have a required identifier ending in `Id`.
- Lifecycle states require a `status` field. Put allowed states in an `enum` constraint whose `value`
  is a compact JSON array string.
- Constraints are structural field-validation contracts shared by frontend and backend. Kinds are
  `min`, `max`, `minLength`, `maxLength`, `pattern`, `enum`, `format`, `unique` and `custom`. Backend
  enforcement is mandatory; the frontend mirrors the same constraint for early feedback. Do not
  invent domain-specific constraint kinds. Dynamic or time-relative conditions, such as age computed
  from a birth date and the current date, are business rules compiled in E5 rather than field metadata.
- In this greenfield run constraint source is `journey`, `user` or `inferred`, never `database` or
  `legacyCode`.
- Do not invent arbitrary restrictive minimums, maximums or enums. Each constraint needs a clear
  description and provenance.
- `invariants` are entity-local truths. Full cross-entity, authorization, transition and calculation
  rules belong to E5.

## Persistence and MDM decision

Classify every entity into exactly one structured `storage.target`:

- `mdm`: stable organization base registrations reused by many transactions and reports, such as
  clients, projects, regions, service catalogs, material catalogs and units of measure. Use kind
  `mdm`, scope `organization`, a required uuid `idField`, and `mdmType` exactly
  `<moduleName>.<EntityId>`. Relationships between MDM records and from transactional records to MDM
  records remain explicit so reporting can traverse client → projects, project → manager/region and
  material → usages without duplicate master rows.
- `moduleDatabase`: transactional or operational records owned by this module, such as service/work
  orders, task execution, time logs, invoices, material movements, stock adjustments and decisions.
  Use scope `module` and name the required uuid `idField`.
- `derived`: projections and assessments calculated from other records. Use scope `none`; do not imply
  a table. A later behavior phase may explicitly choose materialization when justified.
- `external`: references owned by a platform/horizontal/plugin, including authenticated users. Use
  scope `platform`; do not recreate User, authentication or platform audit entities.
- `embedded`: value objects stored inside their owner. Use scope `none`.

The master record and its operational state MUST be separate. `Material`/`MaterialCatalogItem` may be
MDM, while `MaterialInventory`, `InventoryAdjustment` and `MaterialUsage` are module-database records.
Likewise a service catalog item may be MDM while a service order is a transaction. Never place current
quantity, running balance, accumulated totals or transaction history inside the MDM catalog entity.
`storage.notes` explains the decision in human language; it cannot replace the structured target.
Relationship persistence is compiled from the endpoint targets: MDM-to-MDM becomes an MDM
relationship, local-to-local a module reference, and MDM-to-transaction a cross-store reference.
For reports such as project by manager, keep the platform user id as an external reference on the
Project master record and hydrate the authenticated identity; do not duplicate the user in MDM.

## Human edits and adjustment rounds

The widget allows direct edits to titles and descriptions. When a previous draft is supplied, treat it
as the current source, including those human edits. Apply the requested structural change and return a
complete replacement review without rewriting unrelated entities. `changeSummary` lists material
differences only.

## Output

Return exactly one JSON object without Markdown. Use this complete shape for every entity, field,
constraint, invariant and relationship; arrays may be empty only when semantically appropriate.

{
  "type": "clarification",
  "json": {
    "planId": "e4-ontology-review",
    "moduleName": "lowerCamelModule",
    "userLanguage": "en",
    "title": "Business ontology",
    "reviewRound": 1,
    "solutionMode": "new",
    "businessDomain": "Construction and remodeling operations",
    "entities": [
      {
        "entityId": "Project",
        "title": "Project",
        "description": "A construction engagement that carries client, scope, schedule and cost context.",
        "kind": "mdm",
        "ownership": "moduleOwned",
        "sourceRefs": {
          "journeyIds": ["registerProject"],
          "featureIds": ["projectRegistration"],
          "authorityRefs": ["buildflow:projectsetup"]
        },
        "fields": [
          {
            "fieldId": "projectId",
            "title": "Project id",
            "type": "uuid",
            "required": true,
            "description": "Stable project identifier carried between connected journey steps.",
            "constraints": [
              {
                "constraintId": "uniqueProjectId",
                "kind": "unique",
                "value": "true",
                "description": "Each project has one stable identifier.",
                "source": "inferred"
              }
            ]
          }
        ],
        "lifecycleStates": [],
        "invariants": [],
        "storage": {
          "target": "mdm",
          "scope": "organization",
          "idField": "projectId",
          "mdmType": "lowerCamelModule.Project",
          "notes": "Organization master record reused by work orders, costing and reporting. Transactional activity remains in module-database entities."
        }
      }
    ],
    "relationships": [
      {
        "relationshipId": "projectBelongsToClient",
        "fromEntity": "Project",
        "toEntity": "Client",
        "type": "manyToOne",
        "required": true,
        "description": "Each project belongs to one client; a client may have many projects.",
        "persistence": { "mode": "mdmRelationship" }
      }
    ],
    "changeSummary": ["Initial ontology proposal."]
  }
}
