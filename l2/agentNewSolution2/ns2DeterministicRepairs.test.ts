/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2DeterministicRepairs.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  repairComposedInputs,
  repairMdmEntityDefinition,
  repairRuntimeAnchorReferences,
  type RepairableEntityDefinition,
  type RepairableOperationDefinition,
} from '/_102020_/l2/agentNewSolution2/ns2DeterministicRepairs.js';

test('repairMdmEntityDefinition normalizes generated-module MDM metadata', () => {
  const entity: RepairableEntityDefinition & { [key: string]: unknown } = {
    entityId: 'Company',
    title: 'Company',
    description: 'Primary company.',
    ownership: 'moduleOwned',
    kind: 'mdm',
    modelingDecision: 'Company is stable master data.',
    moduleType: 'platform.Company',
    mdmSubtype: 'Company',
    requiresAnchor: false,
    fields: [{ fieldId: 'companyId', type: 'uuid', required: true, description: 'Company id.' }],
  };

  repairMdmEntityDefinition(entity, 'cafeFlow');

  assert.equal(entity.kind, 'mdm');
  assert.equal(entity.ownership, 'mdmOwned');
  assert.equal(entity.moduleType, 'cafeFlow.Company');
});

test('repairComposedInputs adds missing partOf child input for commands that write children', () => {
  const operation: RepairableOperationDefinition & { [key: string]: unknown } = {
    operationId: 'updateOrderStatus',
    title: 'Update order status',
    actor: 'manager',
    entity: 'Order',
    kind: 'update',
    reads: ['Order'],
    writes: ['Order', 'OrderStatusEvent'],
    rulesApplied: [],
    story: { actor: 'manager', goal: 'Update status', steps: ['Select order'], outcome: 'Status is updated' },
    accessPattern: { kind: 'commandInput', description: 'Update status' },
    inputs: [{ inputId: 'status', fieldRef: 'Order.status', required: true, source: 'userInput', description: 'Next status.' }],
    contextResolution: [],
  };

  repairComposedInputs(
    operation,
    {
      Order: { kind: 'core', fields: [] },
      OrderStatusEvent: { kind: 'event', fields: [] },
    },
    [{ type: 'partOf', fromEntity: 'OrderStatusEvent', toEntity: 'Order' }],
  );

  const composedInput = operation.inputs.find(input => input.fieldRef === 'OrderStatusEvent');
  assert.equal(!!composedInput, true);
  assert.equal(composedInput?.source, 'systemDefault');
  assert.equal(composedInput?.required, true);
});

test('repairRuntimeAnchorReferences moves runtime anchor aliases from reads/writes into contextResolution', () => {
  const operation: RepairableOperationDefinition = {
    entity: 'Table',
    kind: 'create',
    reads: ['Company'],
    writes: ['Table', 'Company'],
    inputs: [],
    contextResolution: [],
  };

  repairRuntimeAnchorReferences(operation, {
    Table: {
      kind: 'mdm',
      anchor: {
        entityId: 'Company',
        source: 'runtimeContext',
        originRef: 'businessContext.activeCompanyId',
      },
    },
  });

  assert.deepEqual(operation.reads, []);
  assert.deepEqual(operation.writes, ['Table']);
  assert.equal(operation.contextResolution?.[0]?.source, 'businessContext');
  assert.equal(operation.contextResolution?.[0]?.targetRef, 'businessContext.activeCompanyId');
  assert.equal(operation.contextResolution?.[0]?.originRef, 'businessContext.activeCompanyId');
});
