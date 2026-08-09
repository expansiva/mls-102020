<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e4/promptEntity.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E4 — detail one ontology entity

Generate fields, constraints and entity-local rule references only for the requested entity. The supplied
overview is frozen: do not rename the entity, change its kind/storage/lifecycle/source references, add
entities or change relationships. Write human-facing text in the user's language.

## Field contract

- Field, constraint and invariant ids are lowerCamel.
- Types: `uuid`, `string`, `text`, `number`, `integer`, `boolean`, `money`, `date`, `datetime`, `json`.
- A stored entity must contain the overview's `idField` as required `uuid`.
- Lifecycle states require a `status` field with an `enum` constraint whose value is a compact JSON
  array string containing exactly those states.
- The overview already freezes any named lifecycle subsets required by the supplied sources. Use
  those exact predicates when shaping fields and rule references; do not add, remove or reinterpret them.
- Constraints are shared frontend/backend validation contracts. Kinds: `min`, `max`, `minLength`,
  `maxLength`, `pattern`, `enum`, `format`, `unique`, `custom`. Sources in this greenfield run are
  `journey`, `user` or `inferred`, never `database` or `legacyCode`.
- Do not invent restrictive bounds or enums without a source. Time-relative conditions, authorization,
  cross-entity rules, transitions and calculations belong to E5. `useRules` contains only stable
  lower-camel ids; never repeat rule descriptions in the ontology.
- Include relationship reference fields needed by the supplied touching relationships and connected
  journeys. A reference is carried/selected context, not a raw id that a user must type.
- A later deterministic pass may bind relationships only to fields emitted now. For a stored scalar
  relationship, place the required reference on its actual owning/cardinality side; for an existing
  collection use an explicit JSON/list-reference field. MDM edges and derived joins should use their
  identity or genuine derivation fields and must not receive a fabricated foreign key.

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
  "useRules": ["projectHasClient"]
}
