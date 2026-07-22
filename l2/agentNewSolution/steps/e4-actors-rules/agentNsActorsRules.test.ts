/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e4-actors-rules/agentNsActorsRules.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildNsToolInstruction, createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const TOOL_NAME = 'submitNsActorsRules';
const MODEL_TYPES = ['code', 'design'] as const;
const RULE_CLOSE = 'An order can only be closed after payment is registered.';

void test('agentNsActorsRules tool schema is provider-clean', () => {
  const tool = buildTool();
  const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
  assert.equal(errs, null, errs?.join(' | '));
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsActorsRules live @ ${modelType}: schema accepted + E4 gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'prompt.md'), 'utf8').split('{{toolName}}').join(TOOL_NAME)}\n\n${buildNsToolInstruction(TOOL_NAME, 'the E2 journeys or E3 model artifact is missing or unusable')}`,
      human: [
        '## moduleName: cafeFlow / userLanguage: en',
        '',
        '## E2 actors',
        JSON.stringify([{ actorId: 'attendant', name: 'Attendant' }, { actorId: 'cook', name: 'Cook' }], null, 2),
        '',
        '## E2 journey business rules',
        JSON.stringify([{ journeyId: 'takeoutOrder', businessRules: [RULE_CLOSE] }], null, 2),
        '',
        '## E3 entities',
        JSON.stringify([{ entityId: 'Order', title: 'Order', kind: 'core', ownership: 'moduleOwned' }], null, 2),
      ].join('\n'),
      tool: buildTool(),
    });
    assertLiveResponse(r);
    const {
      prepareE4Artifact,
      validateE4Invariants,
    } = await import('/_102020_/l2/agentNewSolution/steps/e4-actors-rules/gate.js');
    const artifact = prepareE4Artifact(r.args, { moduleName: 'cafeFlow', userLanguage: 'en' });
    const errors = validateE4Invariants(artifact, {
      moduleName: 'cafeFlow',
      e2Actors: ['attendant', 'cook'],
      e2BusinessRules: [RULE_CLOSE],
      entityIds: ['Order'],
    }).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });
}

function buildTool() {
  const schema = JSON.parse(readFileSync(path.join(HERE, '../../schemas/e4-actors-rules.schema.json'), 'utf8'));
  return createNsToolSchema(TOOL_NAME, 'Submit the E4 actors, consolidated rules and external refs.', schema);
}

function config() {
  return parseEnvFile(readFileSync(path.join(MLS_BASE, '.env'), 'utf8'));
}

function assertLiveResponse(r: { modelType: string; status: number; text: string; args: unknown; schemaReject: boolean }) {
  const sample = r.text.replace(/\s+/g, ' ').slice(0, 200);
  assert.ok(!r.schemaReject, `${r.modelType}: schema rejected (${r.status}): ${sample}`);
  assert.equal(r.status, 200, `${r.modelType}: expected 200, got ${r.status}: ${sample}`);
  assert.ok(r.args, `${r.modelType}: no tool_call result`);
}
