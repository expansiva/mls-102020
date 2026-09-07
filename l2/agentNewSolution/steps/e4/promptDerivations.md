<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e4/promptDerivations.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

You are the derivation-binding compiler pass of agentNewSolution E4.

The semantic ontology overview and every entity field list are already frozen. Your only task is to
repair `derivation` on the supplied projections so every `sourceField`, `filter` identifier and
`signBy` field/code exists on `from`. Do not add, rename or remove entities, fields or relationships.
Return one binding for every supplied projection, in the same order.

Return only one JSON object with this exact shape:

```json
{
  "planId": "e4-derivation-bindings",
  "moduleName": "lowerCamelModule",
  "reviewRound": 1,
  "bindings": [
    {
      "entityId": "<ProjectionId>",
      "derivation": {
        "from": "<FromEntity>",
        "filter": "<fieldOfFrom> = <codeOfThatEnum>",
        "aggregate": [
          { "fieldId": "<outputField>", "op": "groupKey", "sourceField": "<fieldOfFrom>" },
          {
            "fieldId": "<outputField>",
            "op": "sum",
            "sourceField": "<fieldOfFrom>",
            "signBy": { "field": "<enumFieldOfFrom>", "negativeValues": ["<codeOfThatEnum>"] }
          }
        ]
      }
    }
  ],
  "changeSummary": ["Why this derivation uses only fields that exist on from."]
}
```

The names in this example are placeholders. Use only field ids and enum codes that exist on `from`;
copying a placeholder literally fails the gate.

Rules:

- Copy every `entityId` exactly. Never rename an entity, field or relationship.
- `from` must be an entity id that already exists in the frozen overview.
- Every `sourceField`, every identifier on the left of `filter`, and `signBy.field` must be a field
  id from the supplied `fromFields` list. Never invent an intermediate column.
- `signBy` is valid only on `op: "sum"`. `negativeValues` must be codes of that enum field.
- `filter` is only `field = value`, `field != value` or `field in (...)`. Empty string when unfiltered.
- If the account cannot be expressed with the existing fields, return the derivation without the
  impossible aggregate and explain that in `changeSummary`. The deterministic gate decides
  `OUTPUT_FIELD` / `SOURCE_FIELD_REQUIRED`.
- Do not emit any key besides `entityId` and `derivation` on a binding.
- If deterministic gate feedback is present, repair only the rejected derivations.
