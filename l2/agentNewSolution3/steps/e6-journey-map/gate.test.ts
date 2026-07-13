/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e6-journey-map/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  deriveE6WorkspaceKinds,
  repairE6WorkflowIds,
  E6GateContext,
  Ns3E6JourneyMapArtifact,
  prepareE6JourneyMap,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution3/steps/e6-journey-map/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const mapSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e6-journey-map.schema.json'), 'utf8')) as Record<string, unknown>;

const gateContext: E6GateContext = {
  moduleName: 'cafeFlow',
  classificationWorkflowIds: ['orderLifecycle'],
  classificationOperationIds: ['createOrder', 'sendOrderToKitchen', 'markOrderReady', 'manageMenuItem'],
  rosterActorIds: ['attendant', 'kitchen', 'manager'],
  entityIds: ['Order', 'MenuItem'],
  nowCapabilityActorIds: ['attendant', 'kitchen'],
};

function validMap(): Ns3E6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [
      {
        workspaceId: 'posWorkspace',
        title: 'Point of sale',
        actor: 'attendant',
        kind: 'workflow',
        entity: 'Order',
        workflowId: 'orderLifecycle',
        operationIds: ['createOrder', 'sendOrderToKitchen'],
        purpose: 'Register orders and send them to the kitchen.',
      },
      {
        workspaceId: 'kitchenQueue',
        title: 'Kitchen queue',
        actor: 'kitchen',
        kind: 'workflow',
        entity: 'Order',
        workflowId: 'orderLifecycle',
        operationIds: ['markOrderReady'],
        purpose: 'Follow pending orders and mark them ready.',
      },
      {
        workspaceId: 'menuManagement',
        title: 'Menu management',
        actor: 'manager',
        kind: 'operation',
        entity: 'MenuItem',
        operationIds: ['manageMenuItem'],
        purpose: 'Maintain the menu items catalog.',
      },
    ],
    landings: [
      { actorId: 'attendant', workspaceId: 'posWorkspace' },
      { actorId: 'kitchen', workspaceId: 'kitchenQueue' },
      { actorId: 'manager', workspaceId: 'menuManagement' },
    ],
    navigationEdges: [
      { from: 'posWorkspace', to: 'kitchenQueue', operationId: 'sendOrderToKitchen', description: 'Order sent to preparation.' },
    ],
  }, { moduleName: 'cafeFlow' });
}

void test('e6 gate passes on a valid journey map', async () => {
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: validMap(),
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(gate.warnings.length, 0);
});

void test('e6 gate blocks a classified operation assigned to no workspace', async () => {
  const map = validMap();
  map.workspaces[0].operationIds = ['createOrder'];
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'operation.unassigned'));
});

void test('e6 gate blocks workspace operations outside the classification', async () => {
  const map = validMap();
  map.workspaces[0].operationIds.push('ghostOperation');
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workspace.operation.unknown'));
});

void test('e6 gate blocks duplicated workspace ids', async () => {
  const map = validMap();
  map.workspaces.push({ ...map.workspaces[2], workspaceId: 'posWorkspace' });
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workspace.id.duplicate'));
});

void test('e6 gate blocks landings pointing to unknown workspaces or actors', async () => {
  const map = validMap();
  map.landings.push({ actorId: 'attendant', workspaceId: 'ghostWorkspace' });
  map.landings.push({ actorId: 'ghostActor', workspaceId: 'posWorkspace' });
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'landing.workspace.unknown'));
  assert.ok(gate.errors.some(issue => issue.code === 'landing.actor.unknown'));
});

void test('e6 gate warns when a now-priority actor has no landing', async () => {
  const map = validMap();
  map.landings = map.landings.filter(landing => landing.actorId !== 'kitchen');
  const gate = await runNs3Gate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.ok(gate.warnings.some(issue => issue.code === 'actor.landing.missing'));
});

void test('e6 repair infers missing workflowId from the classification', () => {
  const artifact = {
    schemaVersion: '2026-07-07-ns3-e6-v1',
    moduleName: 'cafeFlow',
    note: 'x',
    workspaces: [
      { workspaceId: 'posWorkspace', title: 'POS', actor: 'attendant', kind: 'workflow', entity: 'Order', operationIds: ['createOrder', 'sendOrderToKitchen'], purpose: 'x' },
      { workspaceId: 'ambiguous', title: 'A', actor: 'attendant', kind: 'workflow', entity: 'Order', operationIds: ['orphanOp'], purpose: 'x' },
    ],
    landings: [{ actorId: 'attendant', workspaceId: 'posWorkspace' }],
    navigationEdges: [],
  } as never;
  const repaired = repairE6WorkflowIds(artifact, {
    workflows: [{ workflowId: 'orderLifecycle', operationIds: ['createOrder', 'sendOrderToKitchen'] }],
    operations: [
      { operationId: 'createOrder', workflowId: 'orderLifecycle' },
      { operationId: 'sendOrderToKitchen', workflowId: 'orderLifecycle' },
      { operationId: 'orphanOp' },
    ],
  });
  assert.equal(repaired.workspaces[0].workflowId, 'orderLifecycle');
  assert.equal(repaired.workspaces[1].workflowId, undefined);
});

void test('e6 workspace kinds are derived deterministically from the classification facts', () => {
  const artifact = prepareE6JourneyMap({
    workspaces: [
      // LLM mislabeled the entity CRUD page as "workflow" (the 102051 defect): must become entityManagement.
      { workspaceId: 'menuManagement', title: 'Menu', actor: 'manager', kind: 'workflow', entity: 'MenuItem', workflowId: 'orderLifecycle', operationIds: ['createMenuItem', 'updateMenuItem', 'browseMenuItems'], purpose: 'Maintain the menu catalog.' },
      // Management page with an auxiliary read-only query on ANOTHER entity (102052 stockManagement
      // case: low-stock alerts) — the side list must not demote the page to 'operation'.
      { workspaceId: 'stockManagement', title: 'Stock', actor: 'manager', kind: 'operation', entity: 'StockItem', operationIds: ['createStockItem', 'updateStockItem', 'queryStockItems', 'queryLowStockAlerts'], purpose: 'Maintain stock items and follow alerts.' },
      // Workflow-owned operations: stays workflow even if the LLM said otherwise.
      { workspaceId: 'kitchenQueue', title: 'Queue', actor: 'kitchen', kind: 'operation', entity: 'Order', operationIds: ['markOrderReady'], purpose: 'Advance pending orders.' },
      // Standalone query only (dashboard): residual kind operation.
      { workspaceId: 'salesDashboard', title: 'Sales', actor: 'manager', kind: 'workflow', entity: 'Order', operationIds: ['viewSales'], purpose: 'Follow the sales numbers.' },
    ],
    landings: [{ actorId: 'manager', workspaceId: 'menuManagement' }],
    navigationEdges: [],
  }, { moduleName: 'cafeFlow' });

  const derived = deriveE6WorkspaceKinds(artifact, {
    workflows: [{ workflowId: 'orderLifecycle', operationIds: ['markOrderReady'] }],
    operations: [
      { operationId: 'createMenuItem', kind: 'create', entity: 'MenuItem' },
      { operationId: 'updateMenuItem', kind: 'update', entity: 'MenuItem' },
      { operationId: 'browseMenuItems', kind: 'query', entity: 'MenuItem' },
      { operationId: 'createStockItem', kind: 'create', entity: 'StockItem' },
      { operationId: 'updateStockItem', kind: 'update', entity: 'StockItem' },
      { operationId: 'queryStockItems', kind: 'query', entity: 'StockItem' },
      { operationId: 'queryLowStockAlerts', kind: 'query', entity: 'StockLowAlert' },
      { operationId: 'markOrderReady', workflowId: 'orderLifecycle', kind: 'update', entity: 'Order' },
      { operationId: 'viewSales', kind: 'view', entity: 'Order' },
    ],
  });

  assert.equal(derived.workspaces[0].kind, 'entityManagement');
  assert.equal(derived.workspaces[0].workflowId, undefined);
  assert.equal(derived.workspaces[1].kind, 'entityManagement'); // stockManagement with foreign read-only alert list
  assert.equal(derived.workspaces[2].kind, 'workflow');
  assert.equal(derived.workspaces[3].kind, 'operation');
});
