/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e3-ontology/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  E3ModelGateContext,
  Ns3E3EntityArtifact,
  Ns3E3ModelArtifact,
  prepareE3EntityArtifact,
  prepareE3ModelArtifact,
  validateE3EntityInvariants,
  validateE3ModelInvariants,
} from '/_102020_/l2/agentNewSolution3/steps/e3-ontology/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const modelSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e3-model.schema.json'), 'utf8')) as Record<string, unknown>;
const entitySchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e3-entity.schema.json'), 'utf8')) as Record<string, unknown>;

const gateContext: E3ModelGateContext = {
  moduleName: 'cafeFlow',
  userLanguage: 'en',
  e2FeatureIds: ['orderPos', 'kitchenQueue'],
  e2JourneyIds: ['takeoutOrder'],
  e2NonNeverFeatureIds: ['orderPos', 'kitchenQueue'],
};

function validModel(): Ns3E3ModelArtifact {
  return prepareE3ModelArtifact({
    moduleName: 'cafeFlow',
    userLanguage: 'en',
    module: {
      title: 'CafeFlow',
      purpose: 'Register and track orders for small cafeterias.',
      businessDomain: 'Food service POS',
      languages: ['en'],
      visualStyle: 'POS-first, status-driven UI',
    },
    entities: [
      {
        entityId: 'Order',
        title: 'Order',
        description: 'A sales order with items and kitchen status.',
        kind: 'core',
        ownership: 'moduleOwned',
        statusEnum: ['draft', 'sentToKitchen', 'ready', 'closed'],
        lifecycleStates: ['draft', 'sentToKitchen', 'ready', 'closed'],
        sourceRefs: { journeyIds: ['takeoutOrder'], featureIds: ['orderPos', 'kitchenQueue'] },
      },
      {
        entityId: 'MenuItem',
        title: 'Menu item',
        description: 'A product sold by the cafeteria.',
        kind: 'mdm',
        ownership: 'moduleOwned',
        sourceRefs: { featureIds: ['orderPos'] },
      },
    ],
    relationships: [
      {
        relationshipId: 'orderReferencesMenuItem',
        fromEntity: 'Order',
        toEntity: 'MenuItem',
        type: 'manyToOne',
        description: 'Each order line references a menu item.',
      },
    ],
  }, { moduleName: 'cafeFlow', userLanguage: 'en' });
}

function validEntity(): Ns3E3EntityArtifact {
  return prepareE3EntityArtifact({
    entityId: 'Order',
    title: 'Order',
    description: 'A sales order with items and kitchen status.',
    kind: 'core',
    ownership: 'moduleOwned',
    fields: [
      { fieldId: 'orderId', type: 'uuid', required: true, description: 'Primary id' },
      { fieldId: 'menuItemId', type: 'uuid', required: true, description: 'Menu item reference' },
      { fieldId: 'status', type: 'string', required: true, description: 'Order status', enum: ['draft', 'sentToKitchen', 'ready', 'closed'] },
      { fieldId: 'totalAmount', type: 'money', required: true, description: 'Total' },
      { fieldId: 'createdAt', type: 'datetime', required: true, description: 'Created at' },
      { fieldId: 'updatedAt', type: 'datetime', required: true, description: 'Updated at' },
    ],
    statusEnum: ['draft', 'sentToKitchen', 'ready', 'closed'],
    lifecycleStates: ['draft', 'sentToKitchen', 'ready', 'closed'],
  });
}

void test('e3 model gate passes on a valid model', async () => {
  const gate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: modelSchema,
    artifact: validModel(),
    validate: item => validateE3ModelInvariants(item, gateContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

void test('e3 model gate blocks use-case shaped and verb entity ids', async () => {
  const model = validModel();
  model.entities.push({ ...model.entities[0], entityId: 'UcCreateOrder' });
  model.entities.push({ ...model.entities[0], entityId: 'ManageMenu' });
  const gate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: modelSchema,
    artifact: model,
    validate: item => validateE3ModelInvariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'entity.id.usecase'));
  assert.ok(gate.errors.some(issue => issue.code === 'entity.id.verb'));
});

void test('e3 model gate blocks unresolved relationships and warns on uncovered features', async () => {
  const model = validModel();
  model.relationships[0].toEntity = 'Ghost';
  const context: E3ModelGateContext = { ...gateContext, e2NonNeverFeatureIds: ['orderPos', 'kitchenQueue', 'reports'] };
  const gate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: modelSchema,
    artifact: model,
    validate: item => validateE3ModelInvariants(item, context),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'relationship.entity.unknown'));
  assert.ok(gate.warnings.some(issue => issue.code === 'feature.uncovered'));
});

void test('e3 entity gate passes on a valid entity', async () => {
  const gate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: entitySchema,
    artifact: validEntity(),
    validate: item => validateE3EntityInvariants(item, { model: validModel() }),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

void test('e3 entity gate blocks bad field types, missing primary id and status mismatch', async () => {
  const entity = validEntity();
  entity.fields = entity.fields.filter(field => field.fieldId !== 'orderId');
  entity.fields.push({ fieldId: 'weird', type: 'float', required: false, description: 'Bad type' });
  const statusField = entity.fields.find(field => field.fieldId === 'status');
  if (statusField) statusField.enum = ['draft'];
  const gate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: entitySchema,
    artifact: entity,
    validate: item => validateE3EntityInvariants(item, { model: validModel() }),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'field.type.invalid'));
  assert.ok(gate.errors.some(issue => issue.code === 'field.primaryId.missing'));
  assert.ok(gate.errors.some(issue => issue.code === 'field.status.enum.mismatch'));
});

void test('e3 entity gate rejects an entity outside the model and kind drift', async () => {
  const entity = validEntity();
  entity.entityId = 'Ghost';
  const ghostGate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: entitySchema,
    artifact: entity,
    validate: item => validateE3EntityInvariants(item, { model: validModel() }),
  });
  assert.equal(ghostGate.ok, false);
  assert.ok(ghostGate.errors.some(issue => issue.code === 'entity.unknown'));

  const drift = validEntity();
  drift.kind = 'event';
  const driftGate = await runNs3Gate({
    stepId: 'e3-ontology',
    schema: entitySchema,
    artifact: drift,
    validate: item => validateE3EntityInvariants(item, { model: validModel() }),
  });
  assert.equal(driftGate.ok, false);
  assert.ok(driftGate.errors.some(issue => issue.code === 'entity.kind.mismatch'));
});
