<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/promptEntity.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E4 — detail one ontology entity

Generate fields, constraints and entity-local invariants only for the requested entity. The supplied
overview is frozen: do not rename the entity, change its kind/storage/lifecycle/source references, add
entities or change relationships. Write human-facing text in the user's language.

## Field contract

- Field, constraint and invariant ids are lowerCamel.
- Types: `uuid`, `string`, `text`, `number`, `integer`, `boolean`, `money`, `date`, `datetime`, `json`.
- A stored entity must contain the overview's `idField` as required `uuid`.
- Lifecycle states require a `status` field with an `enum` constraint whose value is a compact JSON
  array string containing exactly those states.
- Constraints are shared frontend/backend validation contracts. Kinds: `min`, `max`, `minLength`,
  `maxLength`, `pattern`, `enum`, `format`, `unique`, `custom`. Sources in this greenfield run are
  `journey`, `user` or `inferred`, never `database` or `legacyCode`.
- Do not invent restrictive bounds or enums without a source. Time-relative conditions, authorization,
  cross-entity rules, transitions and calculations belong to E5. Entity-local durable truths may be
  expressed as invariants.
- Include relationship reference fields needed by the supplied touching relationships and connected
  journeys. A reference is carried/selected context, not a raw id that a user must type.

## Output

Return exactly one JSON object without Markdown:

{
  "planId": "e4-ontology-entity",
  "moduleName": "lowerCamelModule",
  "reviewRound": 1,
  "entityId": "Project",
  "fields": [{
    "fieldId": "projectId",
    "title": "Project id",
    "type": "uuid",
    "required": true,
    "description": "Stable identifier carried between connected journey steps.",
    "constraints": [{
      "constraintId": "uniqueProjectId",
      "kind": "unique",
      "value": "true",
      "description": "Each project has one stable identifier.",
      "source": "inferred"
    }]
  }],
  "invariants": [{
    "invariantId": "projectHasClient",
    "description": "A project is associated with one client.",
    "source": "journey"
  }]
}
