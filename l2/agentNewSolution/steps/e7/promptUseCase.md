<!-- mls fileReference="_102020_/l2/agentNewSolution/steps/e7/promptUseCase.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: medium -->

# E7 — describe one reusable business behavior

Describe the behavior shared by the supplied journey steps. The plan is frozen: do not rename the use
case, change its kind or alter `compiledFrom`. This L4 contract is neutral to channel, caller and software
architecture. It does not prescribe how frontend or backend code is organized.

## Boundary

- Describe only the behavior of the compiled step. Do not design operation inputs, outputs or field access.
- Never include actors, profiles, authorities or data scopes. E3 owns authorization; the layer exposing the
  behavior resolves the caller and scope for each journey usage.
- Never include pages, routes, filters for a particular screen, pagination, ordering, selection, projections,
  slices or invalidations. Those belong to E8 operations.
- Never include repositories, ports, adapters, MDM routing, plugins, transactions, idempotency, reads,
  writes or framework terms.
- `contexts.requires` and `contexts.provides` are frozen mechanically in the supplied plan from exact E2
  context ids. Preserve those ids; do not copy context text, origins or business objects.
- `entityRefs` names only the E4 business entities that participate in this behavior. Do not select fields,
  storage destinations, tables or read/write directions. E4 owns structure and storage; downstream generators
  decide their DTOs, queries and persistence from the description, contexts, rules and ontology.
- Reference only E5 rules enforced by this behavior. A rule is a candidate, not automatically applicable
  because an entity or journey mentions it. Never copy a rule description.
- Add a lifecycle transition only when this behavior actually changes an E4 state. Creation and ordinary
  edits do not need invented transitions.
- N journey steps may compile to one use case. Keep the shared behavior invariant; caller-specific concerns
  remain attached to each journey/access realization.

## Output

Return exactly one `{ "type": "flexible", "result": { ... } }` object without Markdown. The `result`
value must be the use case artifact below.

{
  "draftVersion": "2026-08-10-ns4-usecase-draft-minimal-v3",
  "planId": "e7-usecase",
  "moduleName": "lowerCamelModule",
  "useCaseId": "locateProject",
  "title": "Locate project",
  "kind": "query",
  "compiledFrom": ["manageProjects.locateProject"],
  "description": "Locates projects and returns their canonical identity and summary fields.",
  "contexts": {
    "requires": [],
    "provides": ["selectedProject"]
  },
  "entityRefs": ["Project"],
  "useRules": [],
  "transitions": []
}

A real state-changing behavior may use:

{
  "transitions": [{
    "transitionId": "approveChangeOrder",
    "entityRef": "ChangeOrder",
    "fromStates": ["proposed"],
    "toState": "approved",
    "useRules": ["changeOrderCanBeApproved"]
  }]
}
