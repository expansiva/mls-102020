/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/agentNsJourneyMap.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintToolSchema } from '/_102025_/l2/toolSchemaLint.js';
import { callToolProvider, liveTestsEnabled, parseEnvFile } from '/_102025_/l2/testLlmClient.js';
import { buildNsToolInstruction, createNsToolSchema } from '/_102020_/l2/agentNewSolution/helpers/nsLlm.js';
import {
  deriveE6SiteMapKinds,
  prepareE6SiteMap,
  validateE6SiteMap,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MLS_BASE = path.resolve(HERE, '../../../../..');
const MODEL_TYPES = ['code', 'design'] as const;
const SITEMAP_TOOL = 'submitNsSiteMap';

const SITE_MAP_CONTEXT = {
  moduleName: 'cafeFlow',
  classificationWorkflowIds: ['orderLifecycle'],
  classificationOperationIds: ['createOrder', 'viewKitchenQueue'],
  rosterActorIds: ['attendant', 'cook'],
  entityIds: ['Order'],
  nowCapabilityActorIds: ['attendant', 'cook'],
  operationOwnerWorkflow: { createOrder: 'orderLifecycle' },
  operationKind: { createOrder: 'create', viewKitchenQueue: 'query' },
  operationEntity: { createOrder: 'Order', viewKitchenQueue: 'Order' },
  operationActors: { createOrder: ['attendant'], viewKitchenQueue: ['cook'] },
};

void test('agentNsJourneyMap tool schemas are provider-clean', () => {
  for (const spec of [
    { tool: SITEMAP_TOOL, description: 'Submit the E6 site map (the page index).', schema: 'e6-sitemap.schema.json' },
    { tool: 'submitNsWorkspaceDetail', description: 'Submit ONE workspace detail (sections/organisms/bffCalls).', schema: 'e6-workspace.schema.json' },
  ]) {
    const tool = createNsToolSchema(spec.tool, spec.description, readSchema(spec.schema));
    const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
    assert.equal(errs, null, `${spec.schema}: ${errs?.join(' | ')}`);
  }
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsJourneyMap site map live @ ${modelType}: schema accepted + E6 site map gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'promptSiteMap.md'), 'utf8').split('{{toolName}}').join(SITEMAP_TOOL)}\n\n${buildNsToolInstruction(SITEMAP_TOOL, 'the E5 classification artifact is missing or unusable')}`,
      human: [
        '## E5 classification',
        JSON.stringify({
          workflows: [{ workflowId: 'orderLifecycle', actorId: 'attendant', primaryEntity: 'Order', operationIds: ['createOrder'], featureRefs: ['orderPos'] }],
          operations: [
            { operationId: 'createOrder', title: 'Create order', actorId: 'attendant', entity: 'Order', kind: 'create', featureRefs: ['orderPos'], workflowId: 'orderLifecycle' },
            { operationId: 'viewKitchenQueue', title: 'View kitchen queue', actorId: 'cook', entity: 'Order', kind: 'query', featureRefs: ['kitchenQueue'] },
          ],
        }, null, 2),
        '',
        '## Actor roster',
        'attendant, cook',
        '',
        '## Declared entity ids',
        'Order',
        '',
        '## E2 journeys',
        JSON.stringify([{ journeyId: 'takeoutOrder', actorId: 'attendant', steps: [{ featureRefs: ['orderPos', 'kitchenQueue'] }] }], null, 2),
        '',
        '## userLanguage: en',
      ].join('\n'),
      tool: createNsToolSchema(SITEMAP_TOOL, 'Submit the E6 site map (the page index).', readSchema('e6-sitemap.schema.json')),
    });
    assertLiveResponse(r);
    const artifact = deriveE6SiteMapKinds(prepareE6SiteMap(r.args, { moduleName: 'cafeFlow' }), SITE_MAP_CONTEXT);
    const errors = validateE6SiteMap(artifact, SITE_MAP_CONTEXT).issues.filter(issue => issue.severity === 'error');
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
