/// <mls fileReference="_102020_/l2/agentNewSolution2/ns2DeterministicRepairs.test.ts" enhancement="_blank"/>
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  repairComposedInputs,
  repairContextOnlyCommandInputQuery,
  repairMdmEntityDefinition,
  repairRuntimeAnchorReferences,
  repairRuntimeAnchorRelationships,
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

test('repairMdmEntityDefinition forces runtimeContext when anchor origin comes from businessContext', () => {
  const entity: RepairableEntityDefinition = {
    entityId: 'StockItem',
    ownership: 'mdmOwned',
    kind: 'mdm',
    moduleType: 'cafeFlow.StockItem',
    anchor: {
      entityId: 'Company',
      source: 'ontologyEntity',
      originRef: 'businessContext.activeCompanyId',
      relationshipType: 'Owns',
      description: 'Stock item belongs to the current company.',
    },
  };

  repairMdmEntityDefinition(entity, 'cafeFlow');

  assert.equal(entity.anchor?.source, 'runtimeContext');
});

test('repairRuntimeAnchorRelationships removes relationships to external runtime anchor labels', () => {
  const plan = {
    ontology: {
      entities: {
        StockItem: {
          ownership: 'mdmOwned',
          kind: 'mdm',
          anchor: {
            entityId: 'Company',
            source: 'ontologyEntity',
            originRef: 'businessContext.activeCompanyId',
            relationshipType: 'Owns',
            description: 'Stock item belongs to the current company.',
          },
        },
        StockLevel: { kind: 'core' },
      },
    },
    relationships: [
      { relationshipId: 'relStockItemCompany', fromEntity: 'StockItem', toEntity: 'Company', type: 'Owns', decisionReason: 'Company owns stock.' },
      { relationshipId: 'relStockLevelStockItem', fromEntity: 'StockLevel', toEntity: 'StockItem', type: 'partOf', decisionReason: 'Stock level belongs to item.' },
    ],
  };

  repairRuntimeAnchorRelationships(plan);

  assert.equal(plan.ontology.entities.StockItem.anchor.source, 'runtimeContext');
  assert.deepEqual(plan.relationships.map(rel => rel.relationshipId), ['relStockLevelStockItem']);
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

test('repairContextOnlyCommandInputQuery turns runtime context into a compute input payload', () => {
  const operation: RepairableOperationDefinition = {
    entity: 'MenuItem',
    kind: 'query',
    reads: ['MenuItem', 'Order', 'OrderItem'],
    writes: [],
    accessPattern: {
      kind: 'commandInput',
      pagination: 'none',
      selection: 'none',
    },
    inputs: [],
    contextResolution: [
      {
        targetRef: 'filter.companyId',
        source: 'businessContext',
        originRef: 'businessContext.activeCompanyId',
        description: 'Active company scope for AI suggestions.',
      },
    ],
  };

  repairContextOnlyCommandInputQuery(operation, {
    MenuItem: {
      fields: [{ fieldId: 'companyId', type: 'uuid', required: true, description: 'Company id.' }],
    },
  });

  assert.deepEqual(operation.inputs, [
    {
      inputId: 'companyId',
      fieldRef: 'MenuItem.companyId',
      required: true,
      source: 'businessContext',
      description: 'Active company scope for AI suggestions.',
    },
  ]);
  assert.equal(operation.contextResolution?.[0]?.inputId, 'companyId');
  assert.equal(operation.contextResolution?.[0]?.targetRef, 'input.companyId');
});
