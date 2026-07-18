# E5 — Workflows + Operations (agentNsBehavior)

The largest phase-2 step: delivers the module behavior from the frozen E2/E3/E4 artifacts, in
five run kinds handled by one agent file:

1. **Classification call** (`planId: e5-workflows-operations`) — reads `pipeline/e2-journeys.json`,
   `pipeline/e3-model.json` and `pipeline/e4-actors-rules.json`, produces
   `pipeline/e5-classification.json`: which stateful WORKFLOWS exist (actor, primaryEntity,
   featureRefs, owned operationIds) and which atomic OPERATIONS realize them (actor, entity, kind
   create|update|delete|query|view, optional owning workflowId). Every non-never E2 feature must be
   covered (missing 'now' coverage blocks the gate). On success it starts the workflows parallel
   fan-out (hosted under this step) plus the `e5-operations-phase` barrier step.
2. **Parallel fan-out children** (`planId: e5-workflow` / `e5-operation`, collab-messages parallel
   system, 5 slots, compact selector args `workflow:{id}` / `operation:{id}`) — each workflow call
   produces `l4/{module}/workflows/{workflowId}.defs.ts` (states/transitions mirroring the primary entity
   statusEnum, transitions CAUSED by operationIds, embedded story); each operation call produces
   `l4/{module}/operations/{operationId}.defs.ts` (reads/writes, accessPattern with keyField 'Entity.field',
   inputs with declared sources, contextResolution, acceptanceAssertions derived from journey step
   results). Children NEVER return 'failed' (a failed parallel child fails the parent/task) and
   never add steps from inside the fan-out — on any problem they complete-with-trace and let the
   finalize repair round regenerate the missing file. Completed runs use the `input_output`
   interaction cleaner: the defs artifact is on disk, so the LLM payload on the task record is dead
   weight (DynamoDB 400KB item limit).
3. **Operations phase** (`planId: e5-operations-phase`, no LLM) — unlocked when the classification
   step (plan + workflows fan-out) completes: the workflows→operations barrier. Starts the
   operations fan-out (hosted under itself) and the `e5-finalize` step.
4. **Finalize** (`planId: e5-finalize`, no LLM) — verifies every workflow/operation defs file on
   disk. Missing items get ONE sequential repair round (normal steps outside the fan-out, planIds
   `e5-repair-{n}-{id}`) followed by a second finalize (`e5-finalize-2`); still-missing items after
   the repair round fail the step visibly. On green it writes `pipeline/e5-behavior.md`, approves
   the pipeline step and emits the completed `e5-done` anchor result that unlocks E6.

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
Origin contract: every contextResolution entry carries a REQUIRED originRef (catalogued runtime
attribute or 'Entity.field') + description — the server-side resolution recipe agentChangeBackend
materializes; without it the generated handler wrongly demands the value from the request.

## Managed entities (2026-07-11)

The classification also declares `managedEntities`: one entry per entity maintained through
standalone write operations, with an explicit `deletionPolicy` — `delete` (a delete operation must
exist), `inactivate` (an `inactivationState` from the entity statusEnum + an update operation) or
`immutable` (a business `reason`; delete operations are forbidden). The gate blocks any entity with
standalone writes that has no entry: how records leave the base is a business decision, never a
silent omission (the 102051 modules shipped CRUDs with no delete at all). Management operations are
a COMPLETE standalone set per entity (browse + create + update, plus delete when the policy says
so) — create and update are never merged into one ambiguous operation.
