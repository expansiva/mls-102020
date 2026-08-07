<!-- modelType: reasoning -->
<!-- reasoningEffort: high -->

# E5 — compact business-rule plan

Group the supplied exact source catalog into a small rule plan. Do not generate triggers, executable
conditions, enforcement or acceptance cases here; one parallel worker will detail each planned rule.

{{platformSkill}}

## Planning policy

- Every source must appear in at least one `rulePlans[].sourceRefs` or one `routedStatements` entry.
- Merge sources only when they express the same enforceable business decision. Do not create one rule
  per sentence when several sources are evidence for the same rule.
- Keep static scalar validation already represented by E4 field constraints in E4. Route workflows and
  side-effect sequences to E6. E5 owns dynamic, temporal, cross-entity, calculation, transition,
  authorization and visibility rules.
- Freeze ids, meaning, kind, layer, criticality, scope and source grouping. Detail workers cannot change
  these decisions.
- Use only exact ids from the reference index and exact source refs from the catalog.
- Examples are evidence, never constants. Do not decide undefined lifecycle predicates such as which
  statuses mean “active”.
- If an approved source requires a fact or durable business object absent from the reference index,
  record an `upstreamGaps` entry. Never invent a snapshot, authorization record, status predicate,
  relationship or field inside a rule to hide an upstream gap.
- Human adjustment and judge feedback are mandatory. Preserve unrelated ids and groupings.

## Output

Return exactly one JSON object without Markdown. Do not return `coverage`; it is compiled mechanically.

{
  "planId": "e5-rules-plan",
  "moduleName": "lowerCamelModule",
  "userLanguage": "en",
  "title": "Business rules",
  "reviewRound": 1,
  "rulePlans": [{
    "ruleId": "projectRequiresClient",
    "title": "Project requires a client",
    "statement": "A project must be associated with one client before creation.",
    "kind": "validation",
    "layer": "domain",
    "criticality": "blocking",
    "scope": {
      "entityRefs": ["Project", "Client"],
      "fieldRefs": [],
      "relationshipRefs": ["projectBelongsToClient"],
      "journeyRefs": ["createProject"],
      "journeyStepRefs": ["createProject.saveProject"],
      "actorRefs": ["projectManager"],
      "authorityRefs": ["projects:manage"]
    },
    "sourceRefs": ["journey:createProject:rule:jrProjectRequiresClient"]
  }],
  "routedStatements": [{
    "sourceRef": "exact source ref",
    "statement": "ignored and replaced mechanically from the catalog",
    "destination": "e4-fieldConstraint|e4-entityInvariant|e6-workflow|documentation",
    "reason": "why this is not an E5 rule"
  }],
  "upstreamGaps": [{
    "gapId": "missingScheduleExceptionAuthorization",
    "sourceRefs": ["exact source ref"],
    "missingContract": "The missing E4 fact, field, relationship, object or lifecycle meaning",
    "reason": "Why a backend rule cannot evaluate the approved requirement"
  }],
  "changeSummary": ["Initial rule plan."]
}
