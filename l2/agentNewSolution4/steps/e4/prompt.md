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
- Constraints describe structural facts useful to frontend and backend, such as min/max, length,
  pattern, enum, format or uniqueness. In this greenfield run their source is `journey`, `user` or
  `inferred`, never `database` or `legacyCode`.
- Do not invent arbitrary restrictive minimums, maximums or enums. Each constraint needs a clear
  description and provenance.
- `invariants` are entity-local truths. Full cross-entity business rules belong to E5.
- `storage.mode` is always `new`; notes explain persistence intent without choosing SQL tables.

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
        "kind": "core",
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
        "storage": { "mode": "new", "notes": "Persisted by the generated application." }
      }
    ],
    "relationships": [
      {
        "relationshipId": "projectBelongsToClient",
        "fromEntity": "Project",
        "toEntity": "Client",
        "type": "manyToOne",
        "required": true,
        "description": "Each project belongs to one client; a client may have many projects."
      }
    ],
    "changeSummary": ["Initial ontology proposal."]
  }
}
