/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5-behavior/agentNsBehavior.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildNsToolInstruction, createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import {
  NsE5EntityDefsInfo,
  NsE5FeatureRef,
  prepareE5Classification,
  validateE5Classification,
} from '/_102020_/l2/agentNewSolution/steps/e5-behavior/gate.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;
const CLASSIFICATION_TOOL = 'submitNsClassification';

const FEATURES: NsE5FeatureRef[] = [
  { featureId: 'orderPos', priority: 'now' },
  { featureId: 'kitchenQueue', priority: 'now' },
];

const ENTITY_DEFS: Record<string, NsE5EntityDefsInfo> = {
  Order: {
    fields: [{ fieldId: 'orderId' }, { fieldId: 'status' }, { fieldId: 'createdAt' }, { fieldId: 'updatedAt' }],
    statusEnum: ['draft', 'sentToKitchen', 'ready'],
  },
};

void test('agentNsBehavior tool schemas are provider-clean', () => {
  for (const spec of [
    { tool: CLASSIFICATION_TOOL, description: 'Submit the E5 workflows/operations classification.', schema: 'e5-classification.schema.json' },
    { tool: 'submitNsWorkflow', description: 'Submit one canonical workflow definition.', schema: 'e5-workflow.schema.json' },
    { tool: 'submitNsOperation', description: 'Submit one canonical operation definition.', schema: 'e5-operation.schema.json' },
  ]) {
    const tool = createNsToolSchema(spec.tool, spec.description, readSchema(spec.schema));
    const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
    assert.equal(errs, null, `${spec.schema}: ${errs?.join(' | ')}`);
  }
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsBehavior classification live @ ${modelType}: schema accepted + E5 classification gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'prompt.md'), 'utf8').split('{{toolName}}').join(CLASSIFICATION_TOOL)}\n\n${buildNsToolInstruction(CLASSIFICATION_TOOL, 'the E2/E3/E4 artifacts are missing or unusable')}`,
      human: [
        '## E2 journeys and features (frozen, primary source)',
        JSON.stringify({ features: FEATURES, journeys: [{ journeyId: 'takeoutOrder', steps: [{ featureRefs: ['orderPos', 'kitchenQueue'] }] }] }, null, 2),
        '',
        '## E3 entity index',
        JSON.stringify([{ entityId: 'Order', title: 'Order', kind: 'core', statusEnum: ENTITY_DEFS.Order.statusEnum }], null, 2),
        '',
        '## E4 actor roster',
        JSON.stringify([{ actorId: 'attendant' }, { actorId: 'cook' }], null, 2),
        '',
        '## E4 rules',
        JSON.stringify([{ ruleId: 'orderStatusTransitions', appliesTo: ['Order'] }], null, 2),
        '',
        '## moduleName: cafeFlow / userLanguage: en',
      ].join('\n'),
      tool: createNsToolSchema(CLASSIFICATION_TOOL, 'Submit the E5 workflows/operations classification.', readSchema('e5-classification.schema.json')),
    });
    assertLiveResponse(r);
    const artifact = prepareE5Classification(r.args, { moduleName: 'cafeFlow' });
    const errors = validateE5Classification(artifact, {
      moduleName: 'cafeFlow',
      actorIds: ['attendant', 'cook'],
      entityIds: ['Order'],
      features: FEATURES,
      entityDefs: ENTITY_DEFS,
      entityKinds: { Order: 'core' },
    }).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });
}

function readSchema(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas', file), 'utf8'));
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
