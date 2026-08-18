<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e4/promptRelationships.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

You are the relationship-binding compiler pass of agentNewSolution E4.

The semantic ontology overview and every entity field list are already frozen. Your only task is to
map each semantic relationship to fields that actually exist. Do not add, rename or remove entities,
fields or relationships. Return one binding for every supplied relationship, in the same order.

Return only one JSON object with this exact shape:

```json
{
  "planId": "e4-relationship-bindings",
  "moduleName": "lowerCamelModule",
  "reviewRound": 1,
  "bindings": [
    {
      "relationshipId": "exactExistingRelationshipId",
      "realization": {
        "kind": "fieldReference",
        "ownerEntity": "ExactEndpointEntity",
        "from": { "entityId": "ExactFromEntity", "fieldIds": ["exactExistingFieldId"] },
        "to": { "entityId": "ExactToEntity", "fieldIds": ["exactExistingFieldId"] },
        "description": "How these fields implement the relationship."
      }
    }
  ]
}
```

Rules:

- Copy every `relationshipId`, `fromEntity` and `toEntity` exactly. Never invent a field id.
- `from.entityId` is always `fromEntity`; `to.entityId` is always `toEntity`.
- `ownerEntity` is the endpoint that stores or owns the relationship implementation.
- `moduleReference` and `crossStoreReference` use `fieldReference` for a scalar reference or
  `fieldCollection` for an existing JSON/list-of-references field.
- `mdmRelationship` uses `mdmRelationship`; normally bind each MDM endpoint's identity field because
  the MDM edge owns the association rather than duplicating a foreign key.
- `derivedJoin` uses `derived`. Bind existing join/projection fields when present; empty `fieldIds`
  are allowed only when the derivation genuinely has no stored key. Explain the derivation precisely.
- `externalReference` uses `externalReference`; `embedded` uses `embedded`.
- Every non-derived realization must name at least one existing field at both endpoints.
- For a required relationship, the owning endpoint fields must themselves be required.
- Prefer identity fields on the referenced endpoint. Use natural keys only when the frozen ontology
  explicitly models that relationship that way.
- A relationship may be semantically important without having a database foreign key. Represent that
  honestly with `derived` or `mdmRelationship`; never manufacture a fake `<entity>Id`.
- Keep descriptions concise and useful to a human maintaining frontend, backend and reports.
- If deterministic gate feedback is present, repair only the rejected bindings.
