<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/promptUseCase.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E7 — describe one reusable business behavior

Describe the behavior shared by the supplied journey steps. The plan is frozen: do not rename the use
case, change its kind or alter `compiledFrom`. This L4 contract is neutral to channel, caller and software
architecture. It does not prescribe how frontend or backend code is organized.

## Boundary

- Describe only the behavior of the compiled step. Do not absorb rules, inputs or outputs from later steps.
- Never include actors, profiles, authorities or data scopes. E3 owns authorization; the layer exposing the
  behavior resolves the caller and scope for each journey usage.
- Never include pages, routes, filters for a particular screen, pagination, ordering, selection, projections,
  slices or invalidations. Those belong to E8 operations.
- Never include repositories, ports, adapters, MDM routing, plugins, transactions, idempotency or framework
  terms. Reads and writes are business data dependencies, not an implementation prescription.
- `contexts.requires` and `contexts.provides` are frozen mechanically in the supplied plan from exact E2
  context ids. Preserve those ids; do not copy context text, origins or business objects.
- Inputs and outputs are the canonical business contract. Use exact E4 `fieldRef` values when a value maps
  to ontology data; its type is derived from E4 and must not be copied. Declare `type` only for a value that
  has no ontology field, such as free search text or another derived scalar.
- `reads` and `writes` contain only exact E4 entity and field ids. Do not add explanatory copies of E4.
- Reference only E5 rules enforced by this behavior. A rule is a candidate, not automatically applicable
  because an entity or journey mentions it. Never copy a rule description.
- Declare only expected business errors. Infrastructure and authorization errors are owned downstream.
- Add a lifecycle transition only when this behavior actually changes an E4 state. Creation and ordinary
  edits do not need invented transitions.
- N journey steps may compile to one use case. Keep the shared behavior invariant; caller-specific concerns
  remain attached to each journey/access realization.

## Output

Return exactly one JSON object without Markdown:

{
  "draftVersion": "2026-08-10-ns4-usecase-draft-simple-v2",
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
  "inputs": [{
    "inputId": "searchText",
    "type": "string",
    "required": false,
    "description": "Optional text used to locate a project."
  }],
  "outputs": [{
    "outputId": "projectId",
    "required": true,
    "contextId": "selectedProject",
    "fieldRef": { "entityId": "Project", "fieldId": "projectId" },
    "description": "Stable project identity."
  }],
  "reads": [{
    "entityId": "Project",
    "fieldRefs": ["projectId", "name"]
  }],
  "writes": [],
  "useRules": [],
  "transitions": [],
  "errors": []
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
