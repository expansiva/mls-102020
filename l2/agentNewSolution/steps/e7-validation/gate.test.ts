/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/gate.test.ts" enhancement="_blank"/>

// Fixtures are typed literals on purpose: only TYPE imports come from the e2/e3 gates
// (erased at compile), so the runtime import graph stays browser-free and the test
// runs under plain node:test. Schema version literals are duplicated intentionally —
// a version bump must revisit the fixtures (flow.json conventions.schemas).

import test from 'node:test';
import assert from 'node:assert/strict';
import { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import { NsE3EntityArtifact, NsE3ModelArtifact } from '/_102020_/l2/agentNewSolution/steps/e3-ontology/gate.js';
import {
  buildNsModuleDefs,
  buildNsTodoOwners,
  computeNsHealthReport,
  NsE7HealthInput,
} from '/_102020_/l2/agentNewSolution/steps/e7-validation/gate.js';

function validE2(): NsE2JourneysArtifact {
  return {
    schemaVersion: '2026-07-06-ns-e2-v1',
    moduleName: 'cafeFlow',
    moduleTitle: 'CafeFlow',
    userLanguage: 'en',
    version: 1,
    actors: [{ actorId: 'attendant', name: 'Attendant' }],
    journeys: [],
    features: [
      { featureId: 'orderPos', title: 'POS orders', priority: 'now', actorIds: ['attendant'] },
      { featureId: 'menuBrowse', title: 'Browse the menu', priority: 'now', actorIds: ['attendant'] },
      { featureId: 'legacySync', title: 'Legacy sync', priority: 'never', actorIds: [] },
    ],
    decisions: [{ decisionId: 'takeoutFirst', kind: 'scopeChange', summary: 'Takeout flows come first.' }],
    createdAt: '2026-07-07T00:00:00.000Z',
  };
}

function validModel(): NsE3ModelArtifact {
  return {
    schemaVersion: '2026-07-07-ns-e3-v1',
    moduleName: 'cafeFlow',
    userLanguage: 'en',
    version: 1,
    createdAt: '2026-07-07T00:00:00.000Z',
    module: {
      title: 'CafeFlow',
      purpose: 'Register and track orders for small cafeterias.',
      businessDomain: 'Food service POS',
      languages: ['en'],
      visualStyle: 'POS-first, status-driven UI',
    },
    entities: [
      { entityId: 'Order', title: 'Order', description: 'A sales order.', kind: 'core', ownership: 'moduleOwned', statusEnum: ['draft', 'closed'] },
      { entityId: 'MenuItem', title: 'Menu item', description: 'A product sold.', kind: 'mdm', ownership: 'moduleOwned' },
    ],
    relationships: [
      { relationshipId: 'orderReferencesMenuItem', fromEntity: 'Order', toEntity: 'MenuItem', type: 'manyToOne', description: 'Each order line references a menu item.' },
    ],
  };
}

function validEntities(): NsE3EntityArtifact[] {
  return [
    {
      entityId: 'Order',
      title: 'Order',
      description: 'A sales order.',
      kind: 'core',
      ownership: 'moduleOwned',
      fields: [
        { fieldId: 'orderId', type: 'uuid', required: true, description: 'Primary id' },
        { fieldId: 'status', type: 'string', required: true, description: 'Status', enum: ['draft', 'closed'] },
        { fieldId: 'createdAt', type: 'datetime', required: true, description: 'Created at' },
        { fieldId: 'updatedAt', type: 'datetime', required: true, description: 'Updated at' },
      ],
      statusEnum: ['draft', 'closed'],
    },
    {
      entityId: 'MenuItem',
      title: 'Menu item',
      description: 'A product sold.',
      kind: 'mdm',
      ownership: 'moduleOwned',
      fields: [
        { fieldId: 'menuItemId', type: 'uuid', required: true, description: 'Primary id' },
        { fieldId: 'name', type: 'string', required: true, description: 'Name' },
        { fieldId: 'createdAt', type: 'datetime', required: true, description: 'Created at' },
        { fieldId: 'updatedAt', type: 'datetime', required: true, description: 'Updated at' },
      ],
    },
  ];
}

function validInput(): NsE7HealthInput {
  return {
    moduleName: 'cafeFlow',
    e2: validE2(),
    model: validModel(),
    entities: validEntities(),
    e4: {
      actors: [{ actorId: 'attendant' }],
      rules: [{ ruleId: 'orderStatusTransitions' }],
    },
    classification: {
      workflows: [
        { workflowId: 'takeoutOrderLifecycle', actorId: 'attendant', primaryEntity: 'Order', featureRefs: ['orderPos'], operationIds: ['createOrder'] },
      ],
      operations: [
        { operationId: 'createOrder', actorId: 'attendant', entity: 'Order', kind: 'create', featureRefs: ['orderPos'], workflowId: 'takeoutOrderLifecycle' },
        { operationId: 'browseMenu', actorId: 'attendant', entity: 'MenuItem', kind: 'query', featureRefs: ['menuBrowse'] },
      ],
    },
    workflowDefs: [
      {
        workflowId: 'takeoutOrderLifecycle',
        title: 'Takeout order lifecycle',
        pageId: 'takeoutOrderLifecycle',
        actors: ['attendant'],
        operationIds: ['createOrder'],
        entities: ['Order'],
        rulesApplied: ['orderStatusTransitions'],
        capabilities: [{ capabilityId: 'takeoutOrderLifecycle' }],
      },
    ],
    operationDefs: [
      {
        operationId: 'createOrder',
        title: 'Create order',
        actor: 'attendant',
        entity: 'Order',
        kind: 'create',
        reads: ['MenuItem'],
        writes: ['Order'],
        rulesApplied: ['orderStatusTransitions'],
        pageId: 'takeoutOrderLifecycle',
        commandName: 'createOrder',
        bffName: 'cafeFlow.takeoutOrderLifecycle.createOrder',
        accessPattern: { kind: 'byKey', keyField: 'Order.orderId', pagination: false, output: 'single' },
        capability: { capabilityId: 'takeoutOrderLifecycle' },
      },
      {
        operationId: 'browseMenu',
        title: 'Browse menu',
        actor: 'attendant',
        entity: 'MenuItem',
        kind: 'query',
        reads: ['MenuItem', 'MenuItem.name'],
        writes: [],
        rulesApplied: [],
        pageId: 'browseMenu',
        commandName: 'browseMenu',
        bffName: 'cafeFlow.browseMenu.browseMenu',
        accessPattern: { kind: 'list', keyField: 'MenuItem.menuItemId', pagination: true, output: 'list' },
        capability: { capabilityId: 'menuBrowse' },
      },
    ],
    journeyMap: {
      workspaces: [
        { workspaceId: 'posWorkspace', operationIds: ['createOrder'], actor: 'attendant', workflowId: 'takeoutOrderLifecycle' },
        { workspaceId: 'menuWorkspace', operationIds: ['browseMenu'], actor: 'attendant' },
      ],
      landings: [],
    },
  };
}

void test('e7 health report passes on a consistent module', () => {
  const report = computeNsHealthReport(validInput());
  assert.equal(report.passed, true, report.errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  assert.equal(report.errors.length, 0);
  assert.deepEqual(report.counts, { entities: 2, workflows: 1, operations: 2, workspaces: 2 });
});

void test('e7 flags a workflow referencing an unknown operation', () => {
  const input = validInput();
  input.workflowDefs[0].operationIds = ['createOrder', 'ghostOperation'];
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(issue => issue.code === 'workflow.operation.unknown'));
});

void test('e7 flags a bffName that does not follow {module}.{pageId}.{commandName}', () => {
  const input = validInput();
  input.operationDefs[0].bffName = 'cafeFlow.wrongPage.createOrder';
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(issue => issue.code === 'operation.bffName.mismatch'));
});

void test('e7 flags an operation absent from all workspaces as unreachable', () => {
  const input = validInput();
  if (input.journeyMap) input.journeyMap.workspaces[1].operationIds = [];
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(issue => issue.code === 'journey.operation.unreachable' && issue.message.includes('browseMenu')));
});

void test('e7 flags an uncovered now-feature as a blocking capability.unowned error', () => {
  const input = validInput();
  input.e2.features.push({ featureId: 'reports', title: 'Reports', priority: 'now', actorIds: ['attendant'] });
  const report = computeNsHealthReport(input);
  assert.equal(report.passed, false);
  assert.ok(report.errors.some(issue => issue.code === 'capability.unowned' && issue.message.includes('reports')));
});

void test('buildNsTodoOwners produces one toCreate owner per behavior with the correct defPath', () => {
  const input = validInput();
  const owners = buildNsTodoOwners({ moduleName: 'cafeFlow', workflowDefs: input.workflowDefs, operationDefs: input.operationDefs });
  assert.equal(owners.length, 3);
  const workflowOwner = owners.find(owner => owner.ownerType === 'workflow');
  assert.ok(workflowOwner);
  assert.equal(workflowOwner.ownerId, 'takeoutOrderLifecycle');
  assert.equal(workflowOwner.status, 'toCreate');
  assert.equal(workflowOwner.defPath, 'l4/cafeFlow/workflows/takeoutOrderLifecycle.defs.ts');
  assert.equal(workflowOwner.capabilityId, 'takeoutOrderLifecycle');
  const operationOwner = owners.find(owner => owner.ownerId === 'createOrder');
  assert.ok(operationOwner);
  assert.equal(operationOwner.ownerType, 'operation');
  assert.equal(operationOwner.defPath, 'l4/cafeFlow/operations/createOrder.defs.ts');
  assert.equal(operationOwner.pageId, 'takeoutOrderLifecycle');
  assert.equal(operationOwner.commandName, 'createOrder');
  assert.equal(operationOwner.bffName, 'cafeFlow.takeoutOrderLifecycle.createOrder');
});

void test('buildNsModuleDefs carries the module block, relationships and approvedArtifacts', () => {
  const input = validInput();
  const externalRefs = {
    mdm: [{ title: 'Menu as light MDM' }],
    horizontals: [{ title: 'Payments' }],
    plugins: [],
    agents: [{ title: 'Sales insights agent' }],
  };
  const moduleDefs = buildNsModuleDefs({
    moduleName: 'cafeFlow',
    model: input.model,
    entities: input.entities,
    e1Draft: {
      sourcePrompt: 'Build CafeFlow for small cafeterias.',
      openQuestions: [{ questionId: 'revenueModel', question: 'Which revenue model?', classification: 'assumed', impact: 'Pricing screens.' }],
    },
    e2: input.e2,
    e4ExternalRefs: externalRefs,
    journeyDefPath: 'l4/cafeFlow/siteMap.defs.ts',
  });
  assert.equal(moduleDefs.module.moduleName, 'cafeFlow');
  assert.equal(moduleDefs.module.title, 'CafeFlow');
  assert.equal(moduleDefs.module.businessDomain, 'Food service POS');
  assert.equal(moduleDefs.designContext.initialPrompt, 'Build CafeFlow for small cafeterias.');
  assert.equal(moduleDefs.designContext.userLanguage, 'en');
  assert.deepEqual(moduleDefs.designContext.openDetails, [{ title: 'Which revenue model?', description: 'Pricing screens.' }]);
  assert.equal(moduleDefs.designContext.decisions[0].recommendationId, 'takeoutFirst');
  assert.equal(moduleDefs.designContext.decisions[0].accepted, true);
  assert.ok(moduleDefs.ontology.entities.Order);
  assert.deepEqual(moduleDefs.ontology.entities.Order.statusEnum, ['draft', 'closed']);
  assert.equal(moduleDefs.journey.defPath, 'l4/cafeFlow/siteMap.defs.ts');
  assert.equal(moduleDefs.relationships.length, 1);
  assert.equal(moduleDefs.relationships[0].relationshipId, 'orderReferencesMenuItem');
  assert.deepEqual(moduleDefs.approvedArtifacts, externalRefs);
});
