# E5 — Workflows + Operations (agentNs3Behavior)

The largest phase-2 step: delivers the module behavior from the frozen E2/E3/E4 artifacts, in
three run kinds handled by one agent file:

1. **Classification call** (`planId: e5-workflows-operations`) — reads `pipeline/e2-journeys.json`,
   `pipeline/e3-model.json` and `pipeline/e4-actors-rules.json`, produces
   `pipeline/e5-classification.json`: which stateful WORKFLOWS exist (actor, primaryEntity,
   featureRefs, owned operationIds) and which atomic OPERATIONS realize them (actor, entity, kind
   create|update|delete|query|view, optional owning workflowId). Every non-never E2 feature must be
   covered (missing 'now' coverage blocks the gate).
2. **Item chain** (`planId: e5-workflow` / `e5-operation`, one dynamic step per item, sequential —
   all workflows in declared order, then all operations) — each workflow call produces
   `l4/workflows/{workflowId}.defs.ts` (states/transitions mirroring the primary entity statusEnum,
   transitions CAUSED by operationIds, embedded story); each operation call produces
   `l4/operations/{operationId}.defs.ts` (reads/writes, accessPattern with keyField 'Entity.field',
   inputs with declared sources, contextResolution, acceptanceAssertions derived from journey step
   results). The LAST item writes `pipeline/e5-behavior.md`, approves the pipeline step and emits
   the completed `e5-done` anchor result that unlocks E6.

**Deterministic attach** (code, NEVER the LLM): workflow `pageId = workflowId` + `capabilities`;
operation `pageId = owning workflowId || operationId`, `commandName = operationId`,
`bffName = {module}.{pageId}.{commandName}`, `capability` (title/priority follow the owning
workflow when there is one; priority = highest among the featureRefs, now>soon>later>never);
`statusFrontend`/`statusBackend` = `toCreate`.

Gate (`gate.ts`, pure — entity fields/statusEnum arrive as parameters): classification (unique ids,
operation/workflow cross-resolution, feature coverage, actor/entity resolution); workflow (id and
operationIds fixed by the classification, transitions reference declared states and operationIds,
states within the primary entity statusEnum, actors/entities/rules resolve); operation (kind fixed,
reads/writes/entity resolve, keyField field exists in the entity defs on disk, query kinds require
output[], commandInput requires inputs, valid sources, write kinds require writes, deterministic
pageId/commandName/bffName recheck). 1 retry per run with the gate error in context.
