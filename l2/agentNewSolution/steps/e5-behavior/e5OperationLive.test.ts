/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5-behavior/e5OperationLive.test.ts" enhancement="_blank"/>

// LIVE per-step content test (exemplar for skills/agentTest.md). Builds the REAL e5-operation prompt from
// MOCK data and sends it via the shared base testLlmClient — TWICE, modelType `code` (Grok) and `design`
// (Kimi) — then runs the REAL gate on the returned tool args. Catches SYSTEMATIC content/prompt issues
// (e.g. a misleading prompt example) the static lint cannot. DIAGNOSTIC, not a deterministic CI gate.
//
// GATED: skipped unless live tests are enabled (AGENT_LIVE_TESTS=1 — see testLlmClient.liveTestsEnabled),
// so the normal suite / CI never makes a network call.
//   Run:  AGENT_LIVE_TESTS=1 node scripts/run-tests.mjs 102020

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { liveTestsEnabled, liveRuns, callToolProvider, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { createNsToolSchema, buildNsToolInstruction } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import { prepareE5Operation, attachOperationDeterministic, validateE5Operation } from '/_102020_/l2/agentNewSolution/steps/e5-behavior/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..'); // .../mls-base
const OPERATION_TOOL = 'submitNsOperation';
const MODEL_TYPES = ['code', 'design'] as const; // code=Grok, design=Kimi — the two strict-tool providers
const config = () => parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));

// ── MOCK data (a small, representative module slice) ────────────────────────────
const MODULE = 'cafeMock';
const TARGET = { operationId: 'createOrder', title: 'Abrir pedido', actorId: 'waiter', entity: 'Order', kind: 'create' as const, featureRefs: ['ordering'] };
const ENTITY_DEFS = {
  Order: { fields: [{ fieldId: 'id' }, { fieldId: 'tableNumber' }, { fieldId: 'status' }, { fieldId: 'total' }, { fieldId: 'createdAt' }], statusEnum: ['open', 'confirmed', 'delivered', 'cancelled'] },
  MenuItem: { fields: [{ fieldId: 'id' }, { fieldId: 'name' }, { fieldId: 'price' }] },
};
const ACTOR_IDS = ['waiter', 'cook'];
const FEATURES = [{ featureId: 'ordering', priority: 'now' as const }];
const SOURCES = ['userInput', 'actorSession', 'businessContext', 'currentWorkspace', 'selectedEntity', 'activeLifecycleInstance', 'workflowState', 'routeParam', 'previousStepOutput', 'systemDefault'];

function buildPrompts(): { system: string; human: string; tool: unknown } {
  const promptMd = readFileSync(path.join(HERE, 'promptOperation.md'), 'utf8');
  const resultSchema = JSON.parse(readFileSync(path.join(HERE, '..', '..', 'schemas', 'e5-operation.schema.json'), 'utf8'));
  const system = `${promptMd.split('{{toolName}}').join(OPERATION_TOOL)}\n\n${buildNsToolInstruction(OPERATION_TOOL, 'the target operation is missing from the classification')}`;
  const fieldCatalog = Object.entries(ENTITY_DEFS).map(([id, d]) => `- ${id}: ${d.fields.map(f => f.fieldId).join(', ')}`).join('\n');
  const human = [
    '## Target operation (from e5-classification.json — operationId/actor/entity/kind are FIXED)',
    JSON.stringify(TARGET, null, 2), '',
    '## Target entity defs (full fields and statusEnum)',
    JSON.stringify({ entityId: 'Order', ...ENTITY_DEFS.Order }, null, 2), '',
    '## Entity field catalog — the REAL fields of EVERY entity',
    'Use ONLY these for any Entity.field ref. Never invent a field.', fieldCatalog, '',
    '## Valid input/context sources', SOURCES.join(', '), '',
    '## Valid actor ids', ACTOR_IDS.join(', '), '',
    '## userLanguage: pt-BR',
  ].join('\n');
  return { system, human, tool: createNsToolSchema(OPERATION_TOOL, 'Submit one canonical operation definition.', resultSchema) };
}

// One live case per modelType — code AND design, same prompt (per agentTest.md).
for (const modelType of MODEL_TYPES) {
  void test(`e5-operation live @ ${modelType}: schema accepted + gate passes on returned args`, { skip: !liveTestsEnabled() }, async () => {
    const { system, human, tool } = buildPrompts();
    // Repeat liveRuns() times — content/tool-emission failures are intermittent; fail if ANY run fails.
    for (let run = 1; run <= liveRuns(); run++) {
      const r = await callToolProvider(config(), { modelType, system, human, tool });
      const at = `${modelType} run ${run}/${liveRuns()}`;

      // HARD: never a schema-definition rejection, and the model must emit a valid tool call (status 200).
      // A dropped required field / tool-not-emitted lands here as a non-200 (collab-llm TOOL_ARGS_SCHEMA).
      assert.ok(!r.schemaReject, `${at}: schema-definition rejection (status ${r.status}): ${r.text.replace(/\s+/g, ' ').slice(0, 200)}`);
      assert.equal(r.status, 200, `${at}: expected 200, got ${r.status}: ${r.text.replace(/\s+/g, ' ').slice(0, 200)}`);

      // DIAGNOSTIC: run the REAL gate on the returned args. A consistent failure = a systematic problem.
      assert.ok(r.args, `${at}: no tool_call result in response`);
      const defs = attachOperationDeterministic(prepareE5Operation(r.args), { moduleName: MODULE, classification: TARGET, features: FEATURES });
      const gate = validateE5Operation(defs, {
        itemId: TARGET.operationId, moduleName: MODULE, classification: TARGET,
        actorIds: ACTOR_IDS, entityIds: Object.keys(ENTITY_DEFS), ruleIds: [], entityDefs: ENTITY_DEFS,
      });
      const errors = gate.issues.filter(i => i.severity === 'error');
      if (errors.length) console.log(`[${at}] gate errors:\n` + errors.map(e => `  - ${e.code}: ${e.message}`).join('\n'));
      assert.equal(errors.length, 0, `${at}: gate rejected the returned args (${errors.length} error(s)) — see log`);
    }
  });
}
