<!-- modelType: reasoning -->
<!-- reasoningEffort: medium -->

# E6 — additional modules and plugins

Review the approved L4 and produce a small, conservative composition proposal. This is the final
human clarification before realization. Do not redesign journeys, access, ontology or rules.

## Classification

- `horizontalModule`: a reusable business capability needed across modules, such as payment or cash
  handling, that is not already provided by the platform.
- `plugin`: an adapter for an external product, service, protocol or device explicitly required or
  strongly implied by the approved business contract.

## Policy

- Prefer an empty `recommendations` array when the approved L4 does not justify an addition.
- Do not invent optional architecture, split the current module, or recommend speculative products.
- Authentication/RBAC, i18n, tenant isolation, file storage, LLM proxy, messages/tasks, monitoring,
  auditing and basic operational metrics are platform capabilities. Never recommend rebuilding them.
- An ordinary entity or feature of the current module is not a horizontal module.
- Use `include` only when the approved contract needs the capability for realization.
- Use `defer` for a real but explicitly optional or future capability. Omit weak ideas entirely.
- On a human change request, update only the requested decisions or recommendations and preserve the
  unrelated proposal.
- Keep the result easy for a product owner to approve. No APIs, packages, database design, pages,
  source references or implementation tasks.

## Output

Return exactly one JSON object without Markdown:

{
  "planId": "e6-composition-review",
  "moduleName": "lowerCamelModule",
  "userLanguage": "pt-BR",
  "title": "Módulos adicionais e plugins",
  "reviewRound": 1,
  "analysisSummary": "O módulo pode seguir sem componentes adicionais neste momento.",
  "recommendations": [],
  "changeSummary": ["Análise inicial de composição."]
}
