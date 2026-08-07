<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E5 — detail one planned business rule

Generate the executable detail for exactly one frozen rule plan. Do not change its id, title,
statement, kind, layer, criticality, scope or source refs. Do not add rules or routed statements.

## Rule detail policy

- Conditions name technology-neutral facts that exist in the supplied approved context.
- Never invent lifecycle predicates, fields, relationships, snapshots, authorization records or
  durable packages. Never turn examples into hardcoded policy.
- Blocking rules require backend enforcement. Frontend behavior is early feedback only.
- Authorization and visibility cite the frozen collab-auth authorities and enforce data scope and
  disclosure in backend queries/commands.
- Reject effects use a stable UPPER_SNAKE error code and include both positive and negative cases.
- Acceptance cases are executable given/when/then examples derived only from the supplied sources.
- A repair changes only the reported invalid detail and preserves the frozen plan.

## Output

Return exactly one JSON object without Markdown:

{
  "planId": "e5-rule-detail",
  "moduleName": "lowerCamelModule",
  "reviewRound": 1,
  "ruleId": "projectRequiresClient",
  "rule": {
    "ruleId": "projectRequiresClient",
    "title": "Project requires a client",
    "statement": "A project must be associated with one client before creation.",
    "kind": "validation",
    "layer": "domain",
    "criticality": "blocking",
    "scope": {
      "entityRefs": ["Project", "Client"], "fieldRefs": [],
      "relationshipRefs": ["projectBelongsToClient"], "journeyRefs": ["createProject"],
      "journeyStepRefs": ["createProject.saveProject"], "actorRefs": ["projectManager"],
      "authorityRefs": ["projects:manage"]
    },
    "trigger": { "type": "create", "description": "Before project creation." },
    "condition": { "expression": "related Client exists", "facts": ["related client"] },
    "enforcement": {
      "backend": { "required": true, "effect": "reject", "errorCode": "PROJECT_CLIENT_REQUIRED" },
      "frontend": { "behavior": "block", "message": "Select a client." }
    },
    "acceptanceCases": [{
      "caseId": "acceptProjectWithClient", "given": ["A related client exists"],
      "when": "The project is created", "then": "Creation is accepted", "expected": "accept"
    }, {
      "caseId": "rejectProjectWithoutClient", "given": ["No related client exists"],
      "when": "The project is created", "then": "Creation is rejected", "expected": "reject"
    }],
    "sourceRefs": ["journey:createProject:rule:jrProjectRequiresClient"]
  }
}
