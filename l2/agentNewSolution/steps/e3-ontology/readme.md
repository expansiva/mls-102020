# E3 — Ontology (agentNsOntology)

Delivers the module ontology from the human-approved E2 journeys, in two run kinds handled by one
agent file:

1. **Plan call** (`planId: e3-ontology`) — reads `pipeline/e2-journeys.json` (+ `e1-draft.json`),
   produces `pipeline/e3-model.json`: the module block (title/purpose/businessDomain/languages/
   visualStyle — consumed by E7 when assembling `module.defs.ts`), a slim entity index (PascalCase
   ids, kind/ownership, statusEnum, sourceRefs to journeys/features) and the relationship graph.
2. **Entity chain** (`planId: e3-entity`, one dynamic step per entity, sequential) — each call
   produces the canonical `l4/{module}/ontology/{EntityId}.defs.ts` (fields/enums/lifecycle). The
   LAST item writes `pipeline/e3-ontology.md`, approves the pipeline step and emits the completed
   `e3-done` anchor result that unlocks E4.

Gate (`gate.ts`): schema + anti use-case/verb guard + relationship resolution + feature coverage
(warning) for the model; per entity: field types (`uuid|string|text|number|money|boolean|date|
datetime|<EntityId>`), unique camelCase fieldIds, mandatory primary id + audit fields, `status`
field consistent with the plan statusEnum. 1 retry per run with the gate error in context.

Deviation from PropostaAgentNewSolution §3-E3: NO `{module}DesignContext.defs.ts` in the ontology
folder — agentChangeBackend treats every ontology file as a data entity. The design context lives in
`module.defs.ts` (assembled in E7) and in the pipeline artifacts.

Consumers (verified 2026-07-07): backend reads entityId/kind/ownership/fields/eventPolicy and
derives aggregates from relationships; frontend reads fields/statusEnum/lifecycleStates.
