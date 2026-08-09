<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E5 — maintainable business-rule catalog

Create the module's single human-maintainable business-rule catalog. A rule has exactly two fields:
`id` and `description`.

## Policy

- Preserve every required rule id supplied by the approved E2, E3 and E4 artifacts.
- When the approved L4 has no business rules, return an empty `rules` array instead of inventing one.
- Infer each description from the complete approved L4 business context.
- A description is one precise, technology-neutral business sentence that a human and a future LLM
  can understand without reading implementation code.
- Consolidate the full business meaning in the description. Do not replace part of the meaning with
  phrases such as “defined elsewhere”, “maintained by E4” or “enforced by the backend”.
- Do not add scope, source references, triggers, conditions, authorities, error codes, frontend messages,
  acceptance cases, implementation advice or technical fields to a rule.
- Do not duplicate rules merely because several journeys, entities or grants use the same rule id.
- A human change request updates the affected descriptions or adds/removes rules as requested while
  preserving unrelated rules byte-for-byte.
- The generated L4 is the source of truth. Future pages, use cases, tables and maintenance agents scan
  this catalog and decide which rule ids they must use.

## Output

Return exactly one JSON object without Markdown:

{
  "planId": "e5-rules-review",
  "moduleName": "lowerCamelModule",
  "userLanguage": "pt-BR",
  "title": "Regras de negócio",
  "reviewRound": 1,
  "rules": [{
    "id": "clientAvailableForBusinessActivity",
    "description": "Em um projeto, faturamento ou comunicação, só é permitido usar um cliente que esteja ativo, tenha nome e pelo menos um contato: e-mail ou telefone."
  }],
  "changeSummary": ["Catálogo inicial de regras."]
}
