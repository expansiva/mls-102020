/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e5-behavior/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  attachOperationDeterministic,
  attachWorkflowDeterministic,
  E5ClassificationGateContext,
  E5OperationGateContext,
  E5WorkflowGateContext,
  Ns3E5ClassificationArtifact,
  Ns3E5EntityDefsInfo,
  Ns3E5FeatureRef,
  Ns3E5OperationArtifact,
  Ns3E5WorkflowArtifact,
  prepareE5Classification,
  prepareE5Operation,
  prepareE5Workflow,
  validateE5Classification,
  validateE5Operation,
  validateE5Workflow,
} from '/_102020_/l2/agentNewSolution3/steps/e5-behavior/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const classificationSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e5-classification.schema.json'), 'utf8')) as Record<string, unknown>;
const workflowSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e5-workflow.schema.json'), 'utf8')) as Record<string, unknown>;
const operationSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e5-operation.schema.json'), 'utf8')) as Record<string, unknown>;

const features: Ns3E5FeatureRef[] = [
  { featureId: 'orderPos', priority: 'now' },
  { featureId: 'kitchenQueue', priority: 'now' },
  { featureId: 'menuManage', priority: 'soon' },
];

const entityDefs: Record<string, Ns3E5EntityDefsInfo> = {
  Order: {
    fields: [
      { fieldId: 'orderId' }, { fieldId: 'status' }, { fieldId: 'totalAmount' },
      { fieldId: 'createdAt' }, { fieldId: 'updatedAt' },
    ],
    statusEnum: ['draft', 'sentToKitchen', 'ready', 'closed'],
  },
  MenuItem: {
    fields: [
      { fieldId: 'menuItemId' }, { fieldId: 'name' }, { fieldId: 'price' },
      { fieldId: 'createdAt' }, { fieldId: 'updatedAt' },
    ],
  },
};

function validClassification(): Ns3E5ClassificationArtifact {
  return prepareE5Classification({
    moduleName: 'cafeFlow',
    workflows: [{
      workflowId: 'orderLifecycle',
      title: 'Order lifecycle',
      actorId: 'attendant',
      primaryEntity: 'Order',
      featureRefs: ['orderPos', 'kitchenQueue'],
      operationIds: ['createOrder', 'updateOrderStatus'],
    }],
    operations: [
      { operationId: 'createOrder', title: 'Create order', actorId: 'attendant', entity: 'Order', kind: 'create', featureRefs: ['orderPos'], workflowId: 'orderLifecycle' },
      { operationId: 'updateOrderStatus', title: 'Update order status', actorId: 'attendant', entity: 'Order', kind: 'update', featureRefs: ['kitchenQueue'], workflowId: 'orderLifecycle' },
      { operationId: 'manageMenuItems', title: 'Manage menu items', actorId: 'attendant', entity: 'MenuItem', kind: 'update', featureRefs: ['menuManage'] },
      { operationId: 'browseMenuItems', title: 'Browse menu items', actorId: 'attendant', entity: 'MenuItem', kind: 'query', featureRefs: ['menuManage'] },
    ],
  }, { moduleName: 'cafeFlow' });
}

const classificationContext: E5ClassificationGateContext = {
  moduleName: 'cafeFlow',
  actorIds: ['attendant'],
  entityIds: ['Order', 'MenuItem'],
  features,
};

function validWorkflow(): Ns3E5WorkflowArtifact {
  return prepareE5Workflow({
    workflowId: 'orderLifecycle',
    title: 'Order lifecycle',
    executionMode: 'sequential',
    trigger: 'attendant creates a new order',
    actors: ['attendant'],
    states: ['draft', 'sentToKitchen', 'ready', 'closed'],
    transitions: [
      { from: 'draft', to: 'sentToKitchen', on: 'createOrder', by: 'attendant' },
      { from: 'sentToKitchen', to: 'ready', on: 'updateOrderStatus' },
      { from: 'ready', to: 'closed', on: 'updateOrderStatus' },
    ],
    operationIds: ['createOrder', 'updateOrderStatus'],
    entities: ['Order'],
    rulesApplied: [],
    story: {
      actor: 'attendant',
      goal: 'run an order through the kitchen',
      steps: ['create the order', 'follow the kitchen status until served'],
      outcome: 'order served and closed',
    },
  });
}

function workflowContext(): E5WorkflowGateContext {
  return {
    itemId: 'orderLifecycle',
    classification: validClassification().workflows[0],
    actorIds: ['attendant'],
    entityIds: ['Order', 'MenuItem'],
    ruleIds: ['orderStatusTransitions'],
    entityDefs,
  };
}

function validOperation(): Ns3E5OperationArtifact {
  return prepareE5Operation({
    operationId: 'createOrder',
    title: 'Create order',
    actor: 'attendant',
    entity: 'Order',
    kind: 'create',
    reads: ['MenuItem'],
    writes: ['Order'],
    rulesApplied: [],
    story: {
      actor: 'attendant',
      goal: 'register a new order',
      steps: ['pick menu items', 'confirm the order'],
      outcome: 'order created with status draft',
    },
    accessPattern: {
      kind: 'commandInput',
      entity: 'Order',
      keyField: 'Order.orderId',
      pagination: 'none',
      selection: 'none',
      output: [],
    },
    inputs: [
      { inputId: 'menuItemId', fieldRef: 'MenuItem.menuItemId', required: true, source: 'userInput', description: 'Selected menu item' },
    ],
    contextResolution: [
      { targetRef: 'Order.createdAt', source: 'systemDefault', originRef: 'systemDefault.now', description: 'Creation timestamp comes from the server clock' },
    ],
    acceptanceAssertions: ['After confirmation the order exists with status draft'],
  });
}

function operationContext(): E5OperationGateContext {
  return {
    itemId: 'createOrder',
    moduleName: 'cafeFlow',
    classification: validClassification().operations[0],
    actorIds: ['attendant'],
    entityIds: ['Order', 'MenuItem'],
    ruleIds: ['orderStatusTransitions'],
    entityDefs,
  };
}

function attachedOperation() {
  const classification = validClassification();
  return attachOperationDeterministic(validOperation(), {
    moduleName: 'cafeFlow',
    classification: classification.operations[0],
    owningWorkflow: classification.workflows[0],
    features,
  });
}

void test('e5 classification gate passes on a valid classification', async () => {
  const gate = await runNs3Gate({
    stepId: 'e5-workflows-operations',
    schema: classificationSchema,
    artifact: validClassification(),
    validate: item => validateE5Classification(item, classificationContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

void test('e5 classification gate blocks an uncovered now feature and warns on soon', async () => {
  const context: E5ClassificationGateContext = {
    ...classificationContext,
    features: [...features, { featureId: 'reports', priority: 'now' }, { featureId: 'export', priority: 'soon' }],
  };
  const gate = await runNs3Gate({
    stepId: 'e5-workflows-operations',
    schema: classificationSchema,
    artifact: validClassification(),
    validate: item => validateE5Classification(item, context),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'classification.feature.uncovered' && issue.path === 'reports'));
  assert.ok(gate.warnings.some(issue => issue.code === 'classification.feature.uncovered' && issue.path === 'export'));
});

void test('e5 workflow gate blocks transitions referencing unknown states or operations', async () => {
  const workflow = validWorkflow();
  workflow.transitions.push({ from: 'ghostState', to: 'closed', on: 'createOrder' });
  workflow.transitions.push({ from: 'draft', to: 'closed', on: 'ghostOperation' });
  const gate = await runNs3Gate({
    stepId: 'e5-workflows-operations',
    schema: workflowSchema,
    artifact: workflow,
    validate: item => validateE5Workflow(item, workflowContext()),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workflow.transition.state.unknown'));
  assert.ok(gate.errors.some(issue => issue.code === 'workflow.transition.operation.unknown'));
});

void test('e5 workflow gate blocks a state outside the primary entity statusEnum', async () => {
  const workflow = validWorkflow();
  workflow.states.push('ghost');
  const gate = await runNs3Gate({
    stepId: 'e5-workflows-operations',
    schema: workflowSchema,
    artifact: workflow,
    validate: item => validateE5Workflow(item, workflowContext()),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workflow.state.unknown' && issue.path === 'ghost'));
});

void test('e5 operation gate blocks a keyField pointing at an unknown field', async () => {
  const defs = attachedOperation();
  defs.accessPattern = { ...defs.accessPattern, keyField: 'Order.ghostField' };
  const check = validateE5Operation(defs, operationContext());
  assert.ok(check.issues.some(issue => issue.severity === 'error' && issue.code === 'operation.accessPattern.key.unknown'));
});

void test('e5 operation gate blocks commandInput without inputs', async () => {
  const artifact = validOperation();
  artifact.inputs = [];
  const classification = validClassification();
  const defs = attachOperationDeterministic(artifact, {
    moduleName: 'cafeFlow',
    classification: classification.operations[0],
    owningWorkflow: classification.workflows[0],
    features,
  });
  const gate = await runNs3Gate({
    stepId: 'e5-workflows-operations',
    schema: operationSchema,
    artifact,
    validate: () => validateE5Operation(defs, operationContext()),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'operation.inputs.empty'));
});

void test('e5 operation gate blocks a contextResolution entry without originRef', async () => {
  const defs = attachedOperation();
  defs.contextResolution = [
    { targetRef: 'Order.createdAt', source: 'systemDefault', originRef: '', description: 'Creation timestamp comes from the server clock' },
  ];
  const check = validateE5Operation(defs, operationContext());
  assert.ok(check.issues.some(issue => issue.severity === 'error' && issue.code === 'operation.context.origin.missing'));
});

void test('e5 operation gate blocks a businessContext originRef outside the catalog', async () => {
  const defs = attachedOperation();
  defs.contextResolution = [
    { inputId: 'shiftId', targetRef: 'Order.orderId', source: 'businessContext', originRef: 'businessContext.shiftId', description: 'The current shift' },
  ];
  const check = validateE5Operation(defs, operationContext());
  assert.ok(check.issues.some(issue => issue.severity === 'error' && issue.code === 'operation.context.origin.invalid'));
});

void test('e5 operation gate accepts an activeLifecycleInstance originRef resolving to a known entity field', async () => {
  const defs = attachedOperation();
  defs.contextResolution = [
    { inputId: 'shiftId', targetRef: 'Shift.shiftId', source: 'activeLifecycleInstance', originRef: 'Shift.shiftId', description: 'The single Shift with status open' },
  ];
  const context: E5OperationGateContext = {
    ...operationContext(),
    entityIds: ['Order', 'MenuItem', 'Shift'],
    entityDefs: { ...entityDefs, Shift: { fields: [{ fieldId: 'shiftId' }, { fieldId: 'status' }], statusEnum: ['open', 'closed'] } },
  };
  const check = validateE5Operation(defs, context);
  assert.ok(!check.issues.some(issue => issue.code.startsWith('operation.context.origin')), check.issues.map(issue => issue.message).join('; '));
});

void test('e5 operation gate blocks an activeLifecycleInstance originRef on an unknown entity', async () => {
  const defs = attachedOperation();
  defs.contextResolution = [
    { inputId: 'shiftId', targetRef: 'Order.orderId', source: 'activeLifecycleInstance', originRef: 'GhostShift.shiftId', description: 'The single GhostShift with status open' },
  ];
  const check = validateE5Operation(defs, operationContext());
  assert.ok(check.issues.some(issue => issue.severity === 'error' && issue.code === 'operation.context.origin.unknown'));
});

void test('e5 operation gate blocks a bffName drifting from the deterministic value', async () => {
  const defs = attachedOperation();
  defs.bffName = 'cafeFlow.somewhereElse.createOrder';
  const check = validateE5Operation(defs, operationContext());
  assert.ok(check.issues.some(issue => issue.severity === 'error' && issue.code === 'operation.bffName.mismatch'));
});

void test('e5 deterministic attach produces {module}.{pageId}.{commandName}', async () => {
  const owned = attachedOperation();
  assert.equal(owned.pageId, 'orderLifecycle');
  assert.equal(owned.commandName, 'createOrder');
  assert.equal(owned.bffName, 'cafeFlow.orderLifecycle.createOrder');
  assert.equal(owned.capability.capabilityId, 'orderLifecycle');
  assert.equal(owned.capability.priority, 'now');
  assert.equal(owned.statusFrontend, 'toCreate');
  assert.equal(owned.statusBackend, 'toCreate');

  // Standalone operation: pageId falls back to the operationId.
  const classification = validClassification();
  const standalone = attachOperationDeterministic({ ...validOperation(), operationId: 'manageMenuItems' }, {
    moduleName: 'cafeFlow',
    classification: classification.operations[2],
    features,
  });
  assert.equal(standalone.bffName, 'cafeFlow.manageMenuItems.manageMenuItems');
  assert.equal(standalone.capability.priority, 'soon');

  const workflowDefs = attachWorkflowDeterministic(validWorkflow(), {
    classification: classification.workflows[0],
    features,
  });
  assert.equal(workflowDefs.pageId, 'orderLifecycle');
  assert.equal(workflowDefs.capabilities[0].capabilityId, 'orderLifecycle');
  assert.equal(workflowDefs.capabilities[0].priority, 'now');
  assert.equal(workflowDefs.statusFrontend, 'toCreate');
});
