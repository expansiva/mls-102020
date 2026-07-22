/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  collectNsOutputPaths,
  collectNsOutputPathSets,
  deriveE6BffRoutes,
  deriveE6WorkspaceKinds,
  repairE6WorkflowIds,
  E6GateContext,
  NsE6JourneyMapArtifact,
  NsE6OperationFact,
  prepareE6JourneyMap,
  repairE6BffFroms,
  validateE6Invariants,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const mapSchema = JSON.parse(readFileSync(resolve(here, '../../schemas/e6-journey-map.schema.json'), 'utf8')) as Record<string, unknown>;

const operationFacts: Record<string, NsE6OperationFact> = {
  createOrder: { accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true, actors: ['attendant'], inputNames: [], outputTopPaths: [], outputItemPaths: [] },
  sendOrderToKitchen: { accessPatternKind: 'commandInput', selection: 'single', opKind: 'update', hasPublicInput: false, actors: ['attendant'], inputNames: [], outputTopPaths: [], outputItemPaths: [] },
  markOrderReady: { accessPatternKind: 'commandInput', selection: 'multiple', opKind: 'update', hasPublicInput: false, actors: ['kitchen'], inputNames: [], outputTopPaths: [], outputItemPaths: [] },
  manageMenuItem: { accessPatternKind: 'list', selection: 'multiple', opKind: 'update', hasPublicInput: false, actors: ['manager'], inputNames: [], outputTopPaths: [], outputItemPaths: [] },
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

// These fixtures declare organisms only (no explicit bffCalls) — the identity bffCalls are the N2
// default. Strip the frozen bffCalls and re-prepare so a mutation on the organisms is reflected in the
// synthesized calls (validMap() prepared once already, materializing them).
async function gateOf(map: NsE6JourneyMapArtifact) {
  const raw = { ...map, workspaces: map.workspaces.map(workspace => ({ ...workspace, bffCalls: undefined })) };
  return runNsGate({
    stepId: 'e6-journey-map',
    schema: mapSchema,
    artifact: prepareE6JourneyMap(raw, { moduleName: 'cafeFlow' }),
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

void test('e6 gate allows an operation reused by more than one bffCall (relaxed A4.4)', async () => {
  // A4.4 relaxes the old "exactly 1 organism": an operation may feed several bffCalls (e.g. a composed
  // pageLoad AND the granular surface). Here markOrderReady is the kitchenQueue surface and also a
  // contextualAction on menuManagement — two identity bffCalls consuming it, which is allowed.
  const map = validMap();
  map.workspaces[2].actors = ['manager', 'kitchen']; // cover markOrderReady's kitchen actor
  map.workspaces[2].sections[0].organisms.push({ operationId: 'markOrderReady', role: 'contextualAction' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
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
  // A filterControl with no attachTo (createOrder is the identity query call it should have refined).
  map.workspaces[0].sections[0].organisms.push({ role: 'filterControl' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'filterControl.attachTo.missing'));
});

void test('e6 gate blocks filterControl attaching to a non-query bffCall', async () => {
  const map = validMap();
  // sendOrderToKitchen is a command (contextualAction → command identity bffCall): a filter cannot
  // attach to it — attachTo must be a query bffCall.
  map.workspaces[0].sections[0].organisms.push({ role: 'filterControl', attachTo: 'sendOrderToKitchen' });
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
      viewHighlights: { accessPatternKind: 'list', selection: 'none', opKind: showcaseOpKind, hasPublicInput: false, actors: ['public'], inputNames: [], outputTopPaths: [], outputItemPaths: [] },
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
    stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(map, { moduleName: 'petShop' }),
    validate: item => validateE6Invariants(item, landingContext()),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(gate.warnings.length, 0);
});

void test('e6 gate blocks a showcase backed by a non-query operation', async () => {
  const map = landingMap();
  const gate = await runNsGate({
    stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(map, { moduleName: 'petShop' }),
    validate: item => validateE6Invariants(item, landingContext('create')),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'showcase.notQuery'));
});

void test('e6 gate blocks a content organism that references a bffCall', async () => {
  const map = landingMap();
  // hero is a pure content block — it must not carry a dataSource/action (only showcase is data-backed).
  map.workspaces[0].sections[0].organisms[0] = { role: 'hero', dataSource: 'viewHighlights' } as never;
  const gate = await runNsGate({
    stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(map, { moduleName: 'petShop' }),
    validate: item => validateE6Invariants(item, landingContext()),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'content.role.hasReference'));
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

// ── bffCalls: explicit projection contracts (A4.1/A4.2/A4.5/A4.5b) + route derivation (N3) ─────────
const paginatedProductsShape = { kind: 'paginated', fields: [
  { name: 'products', type: 'array', item: { fields: [{ name: 'productId' }, { name: 'name' }, { name: 'price' }] } },
  { name: 'total' },
] };
const bffFacts: Record<string, NsE6OperationFact> = {
  browseProducts: {
    accessPatternKind: 'list', selection: 'single', opKind: 'query', hasPublicInput: true, actors: ['cliente'],
    inputNames: ['searchTerm', 'productCategoryId'],
    // paginated outputShape (products[] + total): top = products/total/$items; item = $items.<col>.
    outputTopPaths: collectNsOutputPathSets(paginatedProductsShape).top,
    outputItemPaths: collectNsOutputPathSets(paginatedProductsShape).item,
  },
  viewProduct: {
    accessPatternKind: 'getById', selection: 'none', opKind: 'view', hasPublicInput: true, actors: ['cliente'],
    inputNames: ['productId'],
    outputTopPaths: collectNsOutputPathSets({ kind: 'object', fields: [{ name: 'productId' }, { name: 'description' }] }).top,
    outputItemPaths: collectNsOutputPathSets({ kind: 'object', fields: [{ name: 'productId' }, { name: 'description' }] }).item,
  },
  reserveProduct: {
    accessPatternKind: 'commandInput', selection: 'none', opKind: 'create', hasPublicInput: true, actors: ['cliente'],
    inputNames: ['productId'], outputTopPaths: [], outputItemPaths: [],
  },
  viewHighlights: {
    accessPatternKind: 'list', selection: 'none', opKind: 'query', hasPublicInput: false, actors: ['cliente'],
    inputNames: [],
    outputTopPaths: collectNsOutputPathSets({ kind: 'list', fields: [{ name: 'highlightId' }, { name: 'label' }] }).top,
    outputItemPaths: collectNsOutputPathSets({ kind: 'list', fields: [{ name: 'highlightId' }, { name: 'label' }] }).item,
  },
};

const bffContext: E6GateContext = {
  moduleName: 'petShop',
  classificationWorkflowIds: [],
  classificationOperationIds: ['browseProducts', 'viewProduct', 'reserveProduct', 'viewHighlights'],
  rosterActorIds: ['cliente'],
  entityIds: ['Product', 'Highlight'],
  nowCapabilityActorIds: [],
  operationFacts: bffFacts,
};

// A catalog workspace with an explicitly projected paginated query, a detail getById, a passthrough
// command, and a composed pageLoad (browseProducts + viewHighlights) consumed via slice.
function bffMap(): NsE6JourneyMapArtifact {
  return deriveE6BffRoutes(prepareE6JourneyMap({
    workspaces: [
      {
        workspaceId: 'catalog',
        title: 'Catálogo',
        actors: ['cliente'],
        kind: 'operation',
        entity: 'Product',
        purpose: 'Buscar produtos e reservar.',
        bffCalls: [
          {
            bffId: 'productList', kind: 'query', uses: [{ operationId: 'browseProducts' }],
            input: [
              { name: 'searchTerm', from: 'browseProducts.searchTerm' },
              { name: 'page', type: 'number' }, // free input (pagination) — no from
            ],
            output: { kind: 'paginated', fields: [
              { name: 'products', type: 'array', from: 'browseProducts.$items', item: { fields: [
                { name: 'productId', from: 'browseProducts.$items.productId' },
                { name: 'name', from: 'browseProducts.$items.name' },
              ] } },
              { name: 'total', from: 'browseProducts.total' },
            ] },
          },
          { bffId: 'productDetail', kind: 'query', uses: [{ operationId: 'viewProduct' }] },
          { bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }] }, // passthrough
          {
            bffId: 'pageLoad', kind: 'query',
            uses: [{ operationId: 'browseProducts' }, { operationId: 'viewHighlights', optional: true }],
            output: { kind: 'object', fields: [
              { name: 'catalogo', type: 'array', from: 'browseProducts.$items', item: { fields: [
                { name: 'productId', from: 'browseProducts.$items.productId' },
              ] } },
              { name: 'destaques', type: 'array', from: 'viewHighlights.$items', item: { fields: [
                { name: 'highlightId', from: 'viewHighlights.$items.highlightId' },
              ] } },
            ] },
          },
        ],
        sections: [
          {
            sectionId: 'catalogo',
            intent: 'Carregar catálogo e destaques, buscar, filtrar e reservar',
            organisms: [
              { role: 'primarySurface', dataSource: 'pageLoad', slice: 'catalogo' },
              { role: 'filterControl', attachTo: 'productList' },
              { role: 'detailPanel', dataSource: 'productDetail' },
              { role: 'contextualAction', action: 'reservar' },
            ],
          },
        ],
      },
    ],
    landings: [{ actorId: 'cliente', workspaceId: 'catalog' }],
    navigationEdges: [],
  }, { moduleName: 'petShop' }));
}

async function bffGate(map: NsE6JourneyMapArtifact) {
  return runNsGate({ stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(map, { moduleName: 'petShop' }), validate: item => validateE6Invariants(item, bffContext) });
}

void test('e6 gate passes on a workspace with explicit bffCall projections + composed pageLoad', async () => {
  const gate = await bffGate(bffMap());
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

// newSolution_16: a command-only page (a "create X" form, no query) — its primarySurface is the
// command FORM (action → command bffCall). changeFrontend renders this as single_form. Without it the
// gate hard-fails (petShop reservationWorkspace = createReservation only).
void test('e6 gate allows a command-form primarySurface and still requires dataSource surfaces to be queries', async () => {
  const formContext: E6GateContext = { ...bffContext, classificationOperationIds: ['reserveProduct'] };
  const raw = {
    workspaces: [{
      workspaceId: 'newReservation', title: 'Nova reserva', actors: ['cliente'], kind: 'operation', entity: 'Product',
      purpose: 'Criar uma nova reserva de produto',
      bffCalls: [{ bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }] }],
      sections: [{ sectionId: 'formulario', intent: 'Preencher e enviar a reserva', organisms: [{ role: 'primarySurface', action: 'reservar' }] }],
    }],
    landings: [{ actorId: 'cliente', workspaceId: 'newReservation' }],
    navigationEdges: [],
  };
  const ok = await runNsGate({ stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(raw, { moduleName: 'petShop' }), validate: item => validateE6Invariants(item, formContext) });
  assert.equal(ok.ok, true, ok.errors.map(issue => issue.message).join('; '));

  // A command via dataSource (a LIST surface) is still wrong — a list must be a query.
  raw.workspaces[0].sections[0].organisms = [{ role: 'primarySurface', dataSource: 'reservar' } as never];
  const bad = await runNsGate({ stepId: 'e6-journey-map', schema: mapSchema, artifact: prepareE6JourneyMap(raw, { moduleName: 'petShop' }), validate: item => validateE6Invariants(item, formContext) });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.some(issue => issue.code === 'organism.reference.kind'));
});

void test('collectNsOutputPaths enumerates the traceable from-suffixes for the real petShop shapes', () => {
  // browseReservations (list, NO envelope total) — a projection may point at $items.<col> only.
  const list = collectNsOutputPaths({ kind: 'list', fields: [{ name: 'reservationCode' }, { name: 'status' }] });
  assert.deepEqual(list.sort(), ['$items', '$items.reservationCode', '$items.status'].sort());
  assert.ok(!list.includes('total')); // a list has no top-level total — op.total must NOT resolve

  // browseProducts (paginated, products[] + total).
  const paginated = collectNsOutputPaths({ kind: 'paginated', fields: [
    { name: 'products', type: 'array', item: { fields: [{ name: 'productId' }, { name: 'name' }] } },
    { name: 'total' },
  ] });
  assert.ok(paginated.includes('total'));
  assert.ok(paginated.includes('$items.productId'));      // shorthand for the primary array
  assert.ok(paginated.includes('products.$items.name'));  // explicit array path

  // createReservation (object with a nested items[] array).
  const object = collectNsOutputPaths({ kind: 'object', fields: [
    { name: 'reservationId' },
    { name: 'items', type: 'array', item: { fields: [{ name: 'reservationItemId' }] } },
  ] });
  assert.ok(object.includes('reservationId'));
  assert.ok(object.includes('items.$items.reservationItemId'));
  assert.ok(object.includes('$items.reservationItemId')); // shorthand for the primary array
});

void test('e6 derives the bffCall route <module>.<workspaceId>.<bffId>', () => {
  const map = bffMap();
  const routes = map.workspaces[0].bffCalls.map(call => call.route);
  assert.ok(routes.includes('petShop.catalog.productList'));
  assert.ok(routes.includes('petShop.catalog.pageLoad'));
});

void test('e6 gate blocks a bffCall input from that is not an operation input (A4.2)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[0].input = [{ name: 'ghost', from: 'browseProducts.ghostField' }];
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.input.from.unknown'));
});

void test('e6 gate blocks a bffCall output from that does not resolve to an outputShape field (A4.2)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[0].output!.fields.push({ name: 'phantom', from: 'browseProducts.$items.phantom' });
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.output.from.unknown'));
});

void test('e6 gate blocks a from referencing an operation not in uses (A4.2)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[1].uses = [{ operationId: 'viewProduct' }]; // productDetail uses viewProduct only
  map.workspaces[0].bffCalls[1].output = { kind: 'object', fields: [{ name: 'x', from: 'browseProducts.total' }] };
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.output.from.unknownOp'));
});

void test('e6 gate blocks a composed command bffCall (A4.5 — only queries compose)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[2].uses = [{ operationId: 'reserveProduct' }, { operationId: 'viewProduct' }];
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.command.composed'));
});

void test('e6 gate blocks optional on a single-use bffCall (A4.5b)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[0].uses = [{ operationId: 'browseProducts', optional: true }];
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.optional.notComposed'));
});

void test('e6 gate requires a valid slice when an organism consumes a composed call (A4.5b)', async () => {
  const map = bffMap();
  // primarySurface consumes the composed pageLoad but drops its slice.
  delete map.workspaces[0].sections[0].organisms[0].slice;
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'organism.slice.missing'));
});

void test('e6 gate blocks a slice that is not a top-level output field of the composed call (A4.5b)', async () => {
  const map = bffMap();
  map.workspaces[0].sections[0].organisms[0].slice = 'inexistente';
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'organism.slice.invalid'));
});

void test('e6 gate blocks an organism dataSource that is not a declared bffCall (no silent identity fill)', async () => {
  // In explicit mode (the workspace declared bffCalls) a stray dataSource must NOT be back-filled with
  // an identity call — it surfaces as organism.reference.unknown (e.g. the LLM typed the operationId
  // "browseProducts" instead of the bffId "productList").
  const map = bffMap();
  map.workspaces[0].sections[0].organisms[0] = { role: 'primarySurface', dataSource: 'browseProducts' };
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'organism.reference.unknown'));
});

void test('e6 gate blocks a duplicated bffId within a workspace (A4.1)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls.push({ bffId: 'productList', kind: 'query', uses: [{ operationId: 'viewProduct' }] });
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.id.duplicate'));
});

// ── P1 (newSolution_14): list/paginated shape — the flat-list-as-paginated defect ─────────────────
void test('e6 gate blocks a paginated output with no array field, and $items.<col> at the top level (P1)', async () => {
  // The petShop defect: kind paginated but flat item columns at the top (no { products[], total }).
  const map = bffMap();
  map.workspaces[0].bffCalls[0].output = { kind: 'paginated', fields: [
    { name: 'productId', from: 'browseProducts.$items.productId' },
    { name: 'name', from: 'browseProducts.$items.name' },
  ] };
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.output.paginated.noArray'), 'shape gate');
  assert.ok(gate.errors.some(issue => issue.code === 'bff.output.from.unknown'), '$items.<col> is inexpressible at top');
});

void test('e6 gate blocks a list output that carries an array/envelope field (P1)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[0].output = { kind: 'list', fields: [
    { name: 'products', type: 'array', from: 'browseProducts.$items', item: { fields: [
      { name: 'productId', from: 'browseProducts.$items.productId' },
    ] } },
  ] };
  const gate = await bffGate(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'bff.output.list.hasEnvelope'));
});

void test('e6 gate passes a well-formed list output (fields are the item columns) (P1)', async () => {
  const map = bffMap();
  map.workspaces[0].bffCalls[0].output = { kind: 'list', fields: [
    { name: 'productId', from: 'browseProducts.$items.productId' },
    { name: 'name', from: 'browseProducts.$items.name' },
  ] };
  const gate = await bffGate(map);
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
});

void test('collectNsOutputPathSets splits top (envelope + $items) from item (columns)', () => {
  const sets = collectNsOutputPathSets({ kind: 'paginated', fields: [
    { name: 'products', type: 'array', item: { fields: [{ name: 'productId' }, { name: 'name' }] } },
    { name: 'total' },
  ] });
  assert.ok(sets.top.includes('products') && sets.top.includes('total') && sets.top.includes('$items'));
  assert.ok(!sets.top.includes('$items.productId'), '$items.<col> is NOT a top path (P1)');
  assert.ok(sets.item.includes('$items.productId') && sets.item.includes('products.$items.name'));
});

// ── repairE6BffFroms: the run12 replay (the EXACT relative paths grok/kimi emitted) ────────────────
// The cheap error predictor: these payloads killed run12's detail phase across 2 repair rounds; the
// repair must qualify every unambiguous single-op `from` so the gate passes without another LLM roll.

const viewDashboardFact: NsE6OperationFact = {
  accessPatternKind: 'getById', selection: 'none', opKind: 'view', hasPublicInput: false, actors: ['gerente'],
  inputNames: ['shiftId', 'unitId'],
  outputTopPaths: ['shiftId', 'unitId', 'status', 'openedAt', 'totalSales', 'totalOrders', 'topSellers', 'lowStockAlerts', '$items'],
  outputItemPaths: [
    'topSellers.$items.menuItemId', 'topSellers.$items.name', 'topSellers.$items.quantity',
    'lowStockAlerts.$items.stockItemId', 'lowStockAlerts.$items.name', 'lowStockAlerts.$items.currentQuantity',
    '$items.menuItemId', '$items.name', '$items.quantity',
  ],
};

function dashboardMap(fields: unknown[]): NsE6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'shiftCommand', title: 'Turno e visão do dia', actors: ['gerente'], kind: 'operation',
      entity: 'Shift', purpose: 'Acompanhar o dia.',
      bffCalls: [{
        bffId: 'dashboardQuery', kind: 'query', uses: [{ operationId: 'viewDashboard' }],
        input: [{ name: 'shiftId', from: 'shiftId' }],
        output: { kind: 'object', fields },
      }],
      sections: [{ sectionId: 'dashboard', intent: 'Acompanhar indicadores', organisms: [{ role: 'primarySurface', dataSource: 'dashboardQuery' }] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'cafeFlow' });
}

void test('repairE6BffFroms qualifies the run12 relative paths (missing op prefix, <array>.$items, $items shorthand)', () => {
  const map = dashboardMap([
    { name: 'totalSales', from: 'totalSales' },                                       // bare top field
    { name: 'topSellers', from: 'viewDashboard.$items', type: 'array', item: { fields: [
      { name: 'menuItemId', from: '$items.menuItemId' },                              // run12: no op prefix
      { name: 'name', from: '$items.name' },
    ] } },
    { name: 'lowStockAlerts', from: 'viewDashboard.lowStockAlerts.$items', type: 'array', item: { fields: [
      { name: 'stockItemId', from: 'lowStockAlerts.$items.stockItemId' },             // run12: no op prefix
      { name: 'currentQuantity', from: 'viewDashboard.$items.currentQuantity' },      // run12: wrong shorthand
    ] } },
  ]);
  repairE6BffFroms(map, { viewDashboard: viewDashboardFact });
  const call = map.workspaces[0].bffCalls[0];
  assert.equal(call.input?.[0].from, 'viewDashboard.shiftId');
  const [totalSales, topSellers, lowStockAlerts] = call.output!.fields;
  assert.equal(totalSales.from, 'viewDashboard.totalSales');
  assert.equal(topSellers.from, 'viewDashboard.$items');
  assert.equal(topSellers.item!.fields[0].from, 'viewDashboard.$items.menuItemId');
  assert.equal(topSellers.item!.fields[1].from, 'viewDashboard.$items.name');
  assert.equal(lowStockAlerts.from, 'viewDashboard.lowStockAlerts', 'the array field points at the collection, not <array>.$items');
  assert.equal(lowStockAlerts.item!.fields[0].from, 'viewDashboard.lowStockAlerts.$items.stockItemId');
  assert.equal(lowStockAlerts.item!.fields[1].from, 'viewDashboard.lowStockAlerts.$items.currentQuantity', 'a wrong $items shorthand re-homes under the enclosing array');
  // And the authoritative gate accepts the repaired map (scoped to this workspace's single operation).
  const issues = validateE6Invariants(map, {
    moduleName: 'cafeFlow', classificationWorkflowIds: [], classificationOperationIds: ['viewDashboard'],
    rosterActorIds: ['gerente'], entityIds: ['Shift'], nowCapabilityActorIds: [],
    operationFacts: { viewDashboard: viewDashboardFact },
  }).issues.filter(issue => issue.severity === 'error');
  assert.equal(issues.length, 0, issues.map(issue => `${issue.code}: ${issue.message}`).join('; '));
});

void test('repairE6BffFroms leaves ambiguous froms alone (composed call; prefix naming another known op)', () => {
  const map = dashboardMap([
    { name: 'shiftId', from: 'otherOp.shiftId' },   // cross-op reference: a REAL mistake, gate must see it
  ]);
  const facts = { viewDashboard: viewDashboardFact, otherOp: { ...viewDashboardFact, outputTopPaths: [] } };
  repairE6BffFroms(map, facts);
  assert.equal(map.workspaces[0].bffCalls[0].output!.fields[0].from, 'otherOp.shiftId');
  const composed = dashboardMap([{ name: 'totalSales', from: 'totalSales' }]);
  composed.workspaces[0].bffCalls[0].uses.push({ operationId: 'otherOp' });
  repairE6BffFroms(composed, facts);
  assert.equal(composed.workspaces[0].bffCalls[0].output!.fields[0].from, 'totalSales', 'a composed call is never auto-qualified');
});
