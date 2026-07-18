/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  deriveE6WorkspaceKinds,
  repairE6WorkflowIds,
  E6GateContext,
  NsE6JourneyMapArtifact,
  NsE6OperationFact,
  prepareE6JourneyMap,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const mapSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e6-journey-map.schema.json'), 'utf8')) as Record<string, unknown>;

const operationFacts: Record<string, NsE6OperationFact> = {
  createOrder: { accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true, actors: ['attendant'] },
  sendOrderToKitchen: { accessPatternKind: 'commandInput', selection: 'single', opKind: 'update', hasPublicInput: false, actors: ['attendant'] },
  markOrderReady: { accessPatternKind: 'commandInput', selection: 'multiple', opKind: 'update', hasPublicInput: false, actors: ['kitchen'] },
  manageMenuItem: { accessPatternKind: 'list', selection: 'multiple', opKind: 'update', hasPublicInput: false, actors: ['manager'] },
};

const gateContext: E6GateContext = {
  moduleName: 'cafeFlow',
  classificationWorkflowIds: ['orderLifecycle'],
  classificationOperationIds: ['createOrder', 'sendOrderToKitchen', 'markOrderReady', 'manageMenuItem'],
  rosterActorIds: ['attendant', 'kitchen', 'manager'],
  entityIds: ['Order', 'MenuItem'],
  nowCapabilityActorIds: ['attendant', 'kitchen'],
  operationFacts,
};

function validMap(): NsE6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [
      {
        workspaceId: 'posWorkspace',
        title: 'Point of sale',
        actors: ['attendant'],
        kind: 'workflow',
        entity: 'Order',
        workflowId: 'orderLifecycle',
        purpose: 'Register orders and send them to the kitchen.',
        sections: [
          {
            sectionId: 'pos',
            intent: 'Register and route orders',
            organisms: [
              { operationId: 'createOrder', role: 'primarySurface' },
              { operationId: 'sendOrderToKitchen', role: 'contextualAction' },
            ],
          },
        ],
      },
      {
        workspaceId: 'kitchenQueue',
        title: 'Kitchen queue',
        actors: ['kitchen'],
        kind: 'workflow',
        entity: 'Order',
        workflowId: 'orderLifecycle',
        purpose: 'Follow pending orders and mark them ready.',
        sections: [
          {
            sectionId: 'queue',
            intent: 'Advance pending orders',
            organisms: [{ operationId: 'markOrderReady', role: 'primarySurface' }],
          },
        ],
      },
      {
        workspaceId: 'menuManagement',
        title: 'Menu management',
        actors: ['manager'],
        kind: 'operation',
        entity: 'MenuItem',
        purpose: 'Maintain the menu items catalog.',
        sections: [
          {
            sectionId: 'menu',
            intent: 'Maintain the catalog',
            organisms: [{ operationId: 'manageMenuItem', role: 'primarySurface' }],
          },
        ],
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

async function gateOf(map: NsE6JourneyMapArtifact) {
  return runNsGate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: map,
    validate: item => validateE6Invariants(item, gateContext),
  });
}

void test('e6 gate passes on a valid journey map and derives operationIds from the organisms', async () => {
  const map = validMap();
  assert.deepEqual(map.workspaces[0].operationIds, ['createOrder', 'sendOrderToKitchen']);
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(gate.warnings.length, 0);
});

void test('e6 gate blocks a classified operation covered by no organism', async () => {
  const map = validMap();
  map.workspaces[1].sections[0].organisms = []; // drop markOrderReady's only organism
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'operation.unassigned'));
});

void test('e6 gate blocks an operation covered by more than one organism', async () => {
  const map = validMap();
  map.workspaces[2].sections[0].organisms.push({ operationId: 'markOrderReady', role: 'contextualAction' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'operation.coverage.duplicate'));
});

void test('e6 gate blocks organisms outside the classification', async () => {
  const map = validMap();
  map.workspaces[0].sections[0].organisms.push({ operationId: 'ghostOperation', role: 'contextualAction' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workspace.operation.unknown'));
});

void test('e6 gate requires exactly one primarySurface per section', async () => {
  const map = validMap();
  // demote the single primarySurface -> section now has zero
  map.workspaces[1].sections[0].organisms[0].role = 'contextualAction';
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'section.primarySurface.count'));
});

void test('e6 gate requires filterControl to declare attachTo', async () => {
  const map = validMap();
  // Move createOrder into menuManagement as a filterControl with NO attachTo; keep every operation
  // covered exactly once (sendOrderToKitchen becomes posWorkspace's surface).
  map.workspaces[2].sections[0].organisms = [
    { operationId: 'manageMenuItem', role: 'primarySurface' },
    { operationId: 'createOrder', role: 'filterControl' }, // no attachTo
  ];
  map.workspaces[0].sections[0].organisms = [{ operationId: 'sendOrderToKitchen', role: 'primarySurface' }];
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'filterControl.attachTo.missing'));
});

void test('e6 gate blocks filterControl attaching to a non-surface', async () => {
  const map = validMap();
  map.workspaces[0].sections[0].organisms = [
    { operationId: 'createOrder', role: 'primarySurface' },
    { operationId: 'sendOrderToKitchen', role: 'filterControl', attachTo: 'markOrderReady' }, // not a surface here
  ];
  map.workspaces[1].sections[0].organisms = [{ operationId: 'markOrderReady', role: 'primarySurface' }];
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'filterControl.attachTo.invalid'));
});

void test('e6 gate blocks detailPanel on a non-getById operation', async () => {
  const map = validMap();
  // sendOrderToKitchen has accessPattern 'commandInput' (not getById)
  map.workspaces[0].sections[0].organisms = [
    { operationId: 'createOrder', role: 'primarySurface' },
    { operationId: 'sendOrderToKitchen', role: 'detailPanel' },
  ];
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'detailPanel.notGetById'));
});

void test('e6 gate blocks batchAction on an ineligible operation', async () => {
  const map = validMap();
  // createOrder: command but selection 'none' AND hasPublicInput true -> ineligible for batchAction
  map.workspaces[0].sections[0].organisms = [
    { operationId: 'sendOrderToKitchen', role: 'primarySurface' },
    { operationId: 'createOrder', role: 'batchAction' },
  ];
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'batchAction.invalid'));
});

void test('e6 gate blocks a workspace whose actors do not cover a hosted operation actor (D6 ⊇)', async () => {
  const map = validMap();
  // posWorkspace hosts createOrder (actor attendant) + sendOrderToKitchen (attendant), but declares
  // only [manager] — the actor union {attendant} is not covered.
  map.workspaces[0].actors = ['manager'];
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workspace.actors.notCovering'));
});

void test('e6 gate accepts a multi-actor workspace that covers every hosted operation actor (D6 ⊇)', async () => {
  const map = validMap();
  // kitchenQueue hosts markOrderReady (kitchen); declaring [kitchen, manager] still covers it.
  map.workspaces[1].actors = ['kitchen', 'manager'];
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

void test('e6 gate allows a navigationEntry to a surface owned by another page (not double coverage)', async () => {
  const map = validMap();
  // menuManagement links to markOrderReady (the kitchen surface) as a navigationEntry — must NOT
  // trigger operation.coverage.duplicate (markOrderReady stays covered once, by kitchenQueue).
  map.workspaces[2].sections[0].organisms.push({ operationId: 'markOrderReady', role: 'navigationEntry' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.ok(!gate.errors.some(issue => issue.code === 'operation.coverage.duplicate'));
});

void test('e6 gate blocks duplicated workspace ids', async () => {
  const map = validMap();
  map.workspaces.push({ ...map.workspaces[2], workspaceId: 'posWorkspace' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'workspace.id.duplicate'));
});

void test('e6 gate blocks landings pointing to unknown workspaces or actors', async () => {
  const map = validMap();
  map.landings.push({ actorId: 'attendant', workspaceId: 'ghostWorkspace' });
  map.landings.push({ actorId: 'ghostActor', workspaceId: 'posWorkspace' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'landing.workspace.unknown'));
  assert.ok(gate.errors.some(issue => issue.code === 'landing.actor.unknown'));
});

void test('e6 gate warns when a now-priority actor has no landing', async () => {
  const map = validMap();
  map.landings = map.landings.filter(landing => landing.actorId !== 'kitchen');
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.ok(gate.warnings.some(issue => issue.code === 'actor.landing.missing'));
});

// ── D7: landing pages + content organisms ─────────────────────────────────
function landingContext(showcaseOpKind: NsE6OperationFact['opKind'] = 'query'): E6GateContext {
  return {
    moduleName: 'petShop',
    classificationWorkflowIds: [],
    classificationOperationIds: ['viewHighlights'],
    rosterActorIds: ['customer'], // 'public' is a pseudo-actor, NOT in the roster
    entityIds: ['Highlight'],
    nowCapabilityActorIds: [],
    operationFacts: {
      viewHighlights: { accessPatternKind: 'list', selection: 'none', opKind: showcaseOpKind, hasPublicInput: false, actors: ['public'] },
    },
  };
}

function landingMap(): NsE6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [
      {
        workspaceId: 'home',
        title: 'Home',
        actors: ['public'],
        kind: 'landing',
        entity: 'Highlight',
        purpose: 'Welcome visitors and showcase the highlights.',
        sections: [
          {
            sectionId: 'welcome',
            intent: 'Introduce the shop and lead to the catalog',
            organisms: [
              { role: 'hero' },
              { operationId: 'viewHighlights', role: 'showcase' },
              { role: 'ctaLink' },
            ],
          },
        ],
      },
    ],
    landings: [{ actorId: 'public', workspaceId: 'home' }],
    navigationEdges: [],
  }, { moduleName: 'petShop' });
}

void test('e6 gate passes on a valid landing (hero + showcase→viewHighlights + ctaLink)', async () => {
  const map = landingMap();
  const gate = await runNsGate({
    stepId: 'e6-journey-map', schema: mapSchema, artifact: map,
    validate: item => validateE6Invariants(item, landingContext()),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(gate.warnings.length, 0);
});

void test('e6 gate blocks a showcase backed by a non-query operation', async () => {
  const map = landingMap();
  const gate = await runNsGate({
    stepId: 'e6-journey-map', schema: mapSchema, artifact: map,
    validate: item => validateE6Invariants(item, landingContext('create')),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'showcase.notQuery'));
});

void test('e6 gate blocks a content organism carrying an operationId, and a content role outside a landing', async () => {
  const map = landingMap();
  map.workspaces[0].sections[0].organisms[0] = { operationId: 'viewHighlights', role: 'hero' } as never; // hero must not carry an op
  const gate = await runNsGate({
    stepId: 'e6-journey-map', schema: mapSchema, artifact: map,
    validate: item => validateE6Invariants(item, landingContext()),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'organism.operationId.unexpected'));
});

void test('e6 gate blocks content roles on a non-landing workspace', async () => {
  const map = validMap();
  map.workspaces[2].sections[0].organisms.push({ role: 'hero' } as never);
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'content.role.notLanding'));
});

void test('e6 repair infers missing workflowId from the classification', () => {
  const artifact = {
    schemaVersion: '2026-07-18-ns-e6-v2',
    moduleName: 'cafeFlow',
    note: 'x',
    workspaces: [
      { workspaceId: 'posWorkspace', title: 'POS', actors: ['attendant'], kind: 'workflow', entity: 'Order', sections: [], operationIds: ['createOrder', 'sendOrderToKitchen'], purpose: 'x' },
      { workspaceId: 'ambiguous', title: 'A', actors: ['attendant'], kind: 'workflow', entity: 'Order', sections: [], operationIds: ['orphanOp'], purpose: 'x' },
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
  const surface = (operationId: string) => ({ sectionId: 'main', intent: 'main', organisms: [{ operationId, role: 'primarySurface' as const }] });
  const surfaceMany = (operationIds: string[]) => ({
    sectionId: 'main',
    intent: 'main',
    organisms: operationIds.map((operationId, index) => ({ operationId, role: index === 0 ? ('primarySurface' as const) : ('contextualAction' as const) })),
  });
  const artifact = prepareE6JourneyMap({
    workspaces: [
      // LLM mislabeled the entity CRUD page as "workflow" (the 102051 defect): must become entityManagement.
      { workspaceId: 'menuManagement', title: 'Menu', actors: ['manager'], kind: 'workflow', entity: 'MenuItem', workflowId: 'orderLifecycle', purpose: 'Maintain the menu catalog.', sections: [surfaceMany(['createMenuItem', 'updateMenuItem', 'browseMenuItems'])] },
      // Management page with an auxiliary read-only query on ANOTHER entity (102052 stockManagement
      // case: low-stock alerts) — the side list must not demote the page to 'operation'.
      { workspaceId: 'stockManagement', title: 'Stock', actors: ['manager'], kind: 'operation', entity: 'StockItem', purpose: 'Maintain stock items and follow alerts.', sections: [surfaceMany(['createStockItem', 'updateStockItem', 'queryStockItems', 'queryLowStockAlerts'])] },
      // Workflow-owned operations: stays workflow even if the LLM said otherwise.
      { workspaceId: 'kitchenQueue', title: 'Queue', actors: ['kitchen'], kind: 'operation', entity: 'Order', purpose: 'Advance pending orders.', sections: [surface('markOrderReady')] },
      // Standalone view only (dashboard): residual kind operation.
      { workspaceId: 'salesDashboard', title: 'Sales', actors: ['manager'], kind: 'workflow', entity: 'Order', purpose: 'Follow the sales numbers.', sections: [surface('viewSales')] },
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
