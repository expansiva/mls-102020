/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3-ontology/agentNsOntology.test.ts" enhancement="_blank"/>

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
const MODEL_TYPES = ['code', 'design'] as const;
const MODEL_TOOL = 'submitNsModel';
const ENTITY_TOOL = 'submitNsEntity';

void test('agentNsOntology tool schemas are provider-clean', () => {
  for (const spec of [
    { tool: MODEL_TOOL, description: 'Submit the E3 ontology model plan.', schema: 'e3-model.schema.json' },
    { tool: ENTITY_TOOL, description: 'Submit one canonical ontology entity definition.', schema: 'e3-entity.schema.json' },
  ]) {
    const tool = createNsToolSchema(spec.tool, spec.description, readSchema(spec.schema));
    const errs = lintToolSchema(JSON.stringify(tool.function.parameters));
    assert.equal(errs, null, `${spec.schema}: ${errs?.join(' | ')}`);
  }
});

for (const modelType of MODEL_TYPES) {
  void test(`agentNsOntology model live @ ${modelType}: schema accepted + E3 model gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'prompt.md'), 'utf8').split('{{toolName}}').join(MODEL_TOOL)}\n\n${buildNsToolInstruction(MODEL_TOOL, 'the E2 journeys artifact is missing or unusable')}`,
      human: [
        '## E2 journeys (frozen, primary source)',
        JSON.stringify(e2JourneysFixture(), null, 2),
        '',
        '## E1 draft (context)',
        JSON.stringify({ moduleName: 'cafeFlow', moduleTitle: 'Cafe Flow', userLanguage: 'en' }, null, 2),
      ].join('\n'),
      tool: createNsToolSchema(MODEL_TOOL, 'Submit the E3 ontology model plan.', readSchema('e3-model.schema.json')),
    });
    assertLiveResponse(r);
    const {
      prepareE3ModelArtifact,
      validateE3ModelInvariants,
    } = await import('/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js');
    const artifact = prepareE3ModelArtifact(r.args, { moduleName: 'cafeFlow', userLanguage: 'en' });
    const errors = validateE3ModelInvariants(artifact, {
      moduleName: 'cafeFlow',
      userLanguage: 'en',
      e2FeatureIds: ['orderPos', 'kitchenQueue'],
      e2JourneyIds: ['takeoutOrder'],
      e2NonNeverFeatureIds: ['orderPos', 'kitchenQueue'],
    }).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });

  void test(`agentNsOntology entity live @ ${modelType}: schema accepted + E3 entity gate passes`, { skip: !liveTestsEnabled() }, async () => {
    const model = modelFixture();
    const r = await callToolProvider(config(), {
      modelType,
      system: `${readFileSync(path.join(HERE, 'promptEntity.md'), 'utf8').split('{{toolName}}').join(ENTITY_TOOL)}\n\n${buildNsToolInstruction(ENTITY_TOOL, 'the target entity is missing from the model')}`,
      human: [
        '## Target entity (from e3-model.json)',
        JSON.stringify(model.entities[0], null, 2),
        '',
        '## All entity ids (valid reference field types)',
        model.entities.map(entity => entity.entityId).join(', '),
        '',
        '## Relationships touching this entity',
        JSON.stringify(model.relationships, null, 2),
        '',
        '## Business rules from related journeys',
        '- An order starts as draft and advances to sentToKitchen.',
        '',
        '## userLanguage: en',
      ].join('\n'),
      tool: createNsToolSchema(ENTITY_TOOL, 'Submit one canonical ontology entity definition.', readSchema('e3-entity.schema.json')),
    });
    assertLiveResponse(r);
    const {
      prepareE3EntityArtifact,
      validateE3EntityInvariants,
    } = await import('/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js');
    const artifact = prepareE3EntityArtifact(r.args);
    const errors = validateE3EntityInvariants(artifact, { model }).issues.filter(issue => issue.severity === 'error');
    assert.equal(errors.length, 0, errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  });
}

function readSchema(file: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(HERE, '../../schemas', file), 'utf8'));
}

function e2JourneysFixture() {
  return {
    moduleName: 'cafeFlow',
    moduleTitle: 'Cafe Flow',
    userLanguage: 'en',
    createdAt: '2026-07-07T00:00:00.000Z',
    actors: [{ actorId: 'attendant', name: 'Attendant' }, { actorId: 'cook', name: 'Cook' }],
    features: [
      { featureId: 'orderPos', title: 'POS order entry', priority: 'now', actorIds: ['attendant'] },
      { featureId: 'kitchenQueue', title: 'Kitchen queue', priority: 'now', actorIds: ['cook', 'attendant'] },
    ],
    journeys: [{ journeyId: 'takeoutOrder', actorId: 'attendant', title: 'Takeout order', steps: [{ featureRefs: ['orderPos', 'kitchenQueue'] }], businessRules: ['Orders move through a kitchen status.'] }],
  };
}

function modelFixture(): { schemaVersion: '2026-07-07-ns-e3-v1'; moduleName: string; userLanguage: string; version: number; createdAt: string; module: { title: string; purpose: string; businessDomain: string; languages: string[]; visualStyle: string }; entities: Array<{ entityId: string; title: string; description: string; kind: 'core' | 'supporting' | 'event' | 'metric' | 'mdm'; ownership: 'moduleOwned' | 'mdmOwned' | 'horizontalOwned' | 'pluginOwned' | 'existingModuleOwned' | 'external'; statusEnum?: string[]; lifecycleStates?: string[]; sourceRefs: { featureIds: string[] } }>; relationships: Array<{ relationshipId: string; fromEntity: string; toEntity: string; type: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany' | 'partOf'; description: string }> } {
  return {
    schemaVersion: '2026-07-07-ns-e3-v1',
    moduleName: 'cafeFlow',
    userLanguage: 'en',
    version: 1,
    createdAt: '2026-07-07T00:00:00.000Z',
    module: { title: 'Cafe Flow', purpose: 'Manage cafe orders.', businessDomain: 'Food service', languages: ['en'], visualStyle: 'Operational POS' },
    entities: [
      { entityId: 'Order', title: 'Order', description: 'A customer order.', kind: 'core', ownership: 'moduleOwned', statusEnum: ['draft', 'sentToKitchen', 'ready'], lifecycleStates: ['draft', 'sentToKitchen', 'ready'], sourceRefs: { featureIds: ['orderPos', 'kitchenQueue'] } },
      { entityId: 'MenuItem', title: 'Menu item', description: 'A product sold by the cafe.', kind: 'mdm', ownership: 'moduleOwned', sourceRefs: { featureIds: ['orderPos'] } },
    ],
    relationships: [{ relationshipId: 'orderReferencesMenuItem', fromEntity: 'Order', toEntity: 'MenuItem', type: 'manyToOne', description: 'Orders reference menu items.' }],
  };
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
