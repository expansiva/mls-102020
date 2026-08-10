<!-- mls fileReference="_102020_/l2/agentNewSolution4/steps/e7/promptUseCase.md" enhancement="_blank" -->
<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E7 — realize one channel-neutral application use case

Compile the supplied journey steps into one application behavior contract. The plan is frozen: do not
rename the use case, change its kind or alter `compiledFrom`. The use case is the source of the hexagonal
application layer and its ports. It never knows pages, routes, widgets, HTTP, BFF slices or navigation.

## Required behavior

- Preserve every supplied actor and exact E3 authority. Never invent an authority code.
- Carry every required and produced E2 context explicitly. Context comes from entry, a previous step,
  a lookup, the actor session or an event; a selected business object is never a raw id typed by a user.
- Use exact E4 entity and field ids. `reads`, `writes`, inputs, outputs, filters and projections must name
  real fields. Relationships already include their concrete endpoint bindings.
- Reference E5 rules only by exact id. Do not copy rule descriptions.
- Apply every supplied E3 grant as an exact `dataScopes` entry. Assigned, own and related scopes are
  query/application predicates, not frontend hiding.
- A query has no writes and declares filters, pagination, selection, ordering and projection.
- A command declares its transaction and idempotency policy. Add lifecycle transitions only when the
  behavior truly changes an entity state, using exact E4 states. Do not invent a transition for creation,
  ordinary field edits or reporting when no source requires it.
- Declare typed business errors with precise conditions. Infrastructure failures are not business errors.
- Derive repository/MDM ports from actual reads and writes. Plugin or horizontal-module ports may only
  reference an E6 capability whose decision is `include`.
- `compiledFrom` can contain several journey steps: this is intentional N→1 reuse. Keep the behavior
  reusable and do not duplicate it per journey.

## Output

Return exactly one JSON object without Markdown:

{
  "planId": "e7-usecase",
  "moduleName": "lowerCamelModule",
  "useCaseId": "locateProject",
  "title": "Locate project",
  "kind": "query",
  "compiledFrom": ["manageProjects.locateProject"],
  "description": "Finds projects visible to the current actor and returns a typed selection.",
  "actorRefs": ["projectManager"],
  "authorityRefs": ["module:projectread"],
  "contexts": {
    "requires": [],
    "provides": [{
      "contextId": "selectedProject",
      "businessObject": "Project",
      "required": true,
      "source": "lookup",
      "sourceRefs": ["manageProjects.locateProject"]
    }]
  },
  "inputs": [{
    "inputId": "searchText",
    "type": "string",
    "required": false,
    "source": "userInput",
    "description": "Optional search text."
  }],
  "outputs": [{
    "outputId": "projectId",
    "type": "uuid",
    "required": true,
    "contextId": "selectedProject",
    "fieldRef": { "entityId": "Project", "fieldId": "projectId" },
    "description": "Stable selected project identity."
  }],
  "reads": [{
    "entityId": "Project",
    "fieldRefs": ["projectId", "name"],
    "purpose": "Search and identify visible projects."
  }],
  "writes": [],
  "useRules": [],
  "dataScopes": [{
    "profileRef": "projectManager",
    "authorityRef": "module:projectread",
    "mode": "assigned",
    "description": "Only assigned projects are visible."
  }],
  "query": {
    "filters": [{
      "fieldRef": { "entityId": "Project", "fieldId": "name" },
      "source": "userInput",
      "required": false
    }],
    "pagination": "cursor",
    "selection": "single",
    "orderBy": [{ "entityId": "Project", "fieldId": "name" }],
    "projection": [
      { "entityId": "Project", "fieldId": "projectId" },
      { "entityId": "Project", "fieldId": "name" }
    ]
  },
  "errors": [],
  "ports": [{
    "portId": "projectReader",
    "kind": "mdm",
    "purpose": "Reads project master data under the approved scope.",
    "entityRef": "Project"
  }]
}

For a command, omit `query` and include:

{
  "command": {
    "transaction": "required",
    "idempotency": "recommended",
    "transitions": [{
      "transitionId": "approveChangeOrder",
      "entityRef": "ChangeOrder",
      "fromStates": ["proposed"],
      "toState": "approved",
      "useRules": ["changeOrderCanBeApproved"]
    }],
    "emits": ["changeOrderApproved"]
  }
}
