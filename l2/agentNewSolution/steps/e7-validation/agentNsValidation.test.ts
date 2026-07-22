/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/agentNsValidation.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNsTodoOwners,
  computeNsHealthReport,
  NsE7HealthInput,
} from '/_102020_/l2/agentNewSolution/steps/e7-validation/gate.js';

void test('agentNsValidation is mechanical: health report passes on a consistent handoff', () => {
  const input = validInput();
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, true, report.errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));

  const owners = buildNsTodoOwners({ moduleName: input.moduleName, workflowDefs: input.workflowDefs, operationDefs: input.operationDefs });
  assert.deepEqual(owners.map(owner => `${owner.ownerType}:${owner.ownerId}`).sort(), [
    'operation:createOrder',
    'operation:viewKitchenQueue',
    'workflow:orderLifecycle',
  ]);
});

void test('agentNsValidation catches an invalid LLM-produced handoff before finalize', () => {
  const input = validInput();
  input.operationDefs[0].bffName = 'cafeFlow.wrongPage.createOrder';
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(issue => issue.code === 'operation.bffName.mismatch'));
});

function validInput(): NsE7HealthInput {
  return {
    moduleName: 'cafeFlow',
    e2: {
      schemaVersion: '2026-07-06-ns-e2-v1',
      moduleName: 'cafeFlow',
      moduleTitle: 'Cafe Flow',
      userLanguage: 'en',
      version: 1,
      actors: [{ actorId: 'attendant', name: 'Attendant' }, { actorId: 'cook', name: 'Cook' }],
      journeys: [],
      features: [
        { featureId: 'orderPos', title: 'POS orders', priority: 'now', actorIds: ['attendant'] },
        { featureId: 'kitchenQueue', title: 'Kitchen queue', priority: 'now', actorIds: ['cook'] },
      ],
      decisions: [],
      createdAt: '2026-07-07T00:00:00.000Z',
    },
    model: {
      schemaVersion: '2026-07-07-ns-e3-v1',
      moduleName: 'cafeFlow',
      userLanguage: 'en',
      version: 1,
      createdAt: '2026-07-07T00:00:00.000Z',
      module: { title: 'Cafe Flow', purpose: 'Manage cafe orders.', businessDomain: 'Food service', languages: ['en'], visualStyle: 'Operational POS' },
      entities: [{ entityId: 'Order', title: 'Order', description: 'Customer order.', kind: 'core', ownership: 'moduleOwned', statusEnum: ['draft', 'ready'] }],
      relationships: [],
    },
    entities: [{
      entityId: 'Order',
      title: 'Order',
      description: 'Customer order.',
      kind: 'core',
      ownership: 'moduleOwned',
      fields: [
        { fieldId: 'orderId', type: 'uuid', required: true, description: 'Primary id' },
        { fieldId: 'status', type: 'string', required: true, description: 'Status', enum: ['draft', 'ready'] },
        { fieldId: 'createdAt', type: 'datetime', required: true, description: 'Created at' },
        { fieldId: 'updatedAt', type: 'datetime', required: true, description: 'Updated at' },
      ],
      statusEnum: ['draft', 'ready'],
    }],
    e4: {
      actors: [{ actorId: 'attendant' }, { actorId: 'cook' }],
      rules: [{ ruleId: 'orderStatusTransitions' }],
    },
    classification: {
      workflows: [{ workflowId: 'orderLifecycle', actorId: 'attendant', primaryEntity: 'Order', featureRefs: ['orderPos'], operationIds: ['createOrder'] }],
      operations: [
        { operationId: 'createOrder', actorId: 'attendant', entity: 'Order', kind: 'create', featureRefs: ['orderPos'], workflowId: 'orderLifecycle' },
        { operationId: 'viewKitchenQueue', actorId: 'cook', entity: 'Order', kind: 'query', featureRefs: ['kitchenQueue'] },
      ],
    },
    workflowDefs: [{
      workflowId: 'orderLifecycle',
      title: 'Order lifecycle',
      pageId: 'orderLifecycle',
      actors: ['attendant'],
      operationIds: ['createOrder'],
      entities: ['Order'],
      rulesApplied: ['orderStatusTransitions'],
      capabilities: [{ capabilityId: 'orderPos' }],
    }],
    operationDefs: [
      {
        operationId: 'createOrder',
        title: 'Create order',
        actor: 'attendant',
        entity: 'Order',
        kind: 'create',
        reads: [],
        writes: ['Order'],
        rulesApplied: ['orderStatusTransitions'],
        pageId: 'orderLifecycle',
        commandName: 'createOrder',
        bffName: 'cafeFlow.orderLifecycle.createOrder',
        accessPattern: { kind: 'byKey', keyField: 'Order.orderId', pagination: false, output: 'single' },
        capability: { capabilityId: 'orderPos' },
      },
      {
        operationId: 'viewKitchenQueue',
        title: 'View kitchen queue',
        actor: 'cook',
        entity: 'Order',
        kind: 'query',
        reads: ['Order'],
        writes: [],
        rulesApplied: [],
        pageId: 'viewKitchenQueue',
        commandName: 'viewKitchenQueue',
        bffName: 'cafeFlow.viewKitchenQueue.viewKitchenQueue',
        accessPattern: { kind: 'list', keyField: 'Order.orderId', pagination: true, output: 'list' },
        capability: { capabilityId: 'kitchenQueue' },
      },
    ],
    journeyMap: {
      workspaces: [
        { workspaceId: 'orderLifecycle', operationIds: ['createOrder'], actor: 'attendant', workflowId: 'orderLifecycle' },
        { workspaceId: 'kitchenQueue', operationIds: ['viewKitchenQueue'], actor: 'cook' },
      ],
      landings: [],
    },
  };
}
