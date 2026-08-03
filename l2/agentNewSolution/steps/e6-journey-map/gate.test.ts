/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import { parseNsCategoryCatalog } from '/_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.js';
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
  repairE6OrganismReferences,
  repairE6OutputNesting,
  stampE6PickerUsage,
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

// ---------------------------------------------------------------------------
// presentation (improveNewSolution T1/T3): category/style classification
// ---------------------------------------------------------------------------

// A TEST catalog, not the real one: these tests must not break when categoryList.json evolves (the
// real file is covered by helpers/nsCategoryCatalog.test.ts).
const testCatalog = parseNsCategoryCatalog({
  categories: [
    { categoryId: 'productCatalog', name: 'Product Catalog', description: 'Catalog maintenance.' },
    { categoryId: 'operationsQueue', name: 'Operations Queue', description: 'Work queue.' },
    { categoryId: 'readOnlyDetailPortal', name: 'Read-only Detail Portal', description: 'Read-only.' },
    { categoryId: 'dashboardCommandCenter', name: 'Dashboard', description: 'Monitoring.' },
    { categoryId: 'processWizard', name: 'Process Wizard', description: 'Multi-step.' },
    { categoryId: 'importMappingWizard', name: 'Import Mapping Wizard', description: 'Upload/map.', parentCategory: 'processWizard' },
  ],
})!;

function presentationContext(overrides: Partial<E6GateContext> = {}): E6GateContext {
  return { ...bffContext, categoryCatalog: testCatalog, templateStyleRefs: ['salesforceStyle'], ...overrides };
}

// bffMap()'s catalog workspace: paginated query + detail + command, query-backed primarySurface.
function presentedMap(presentation: unknown): NsE6JourneyMapArtifact {
  const map = bffMap();
  (map.workspaces[0] as unknown as Record<string, unknown>).presentation = presentation;
  return prepareE6JourneyMap(map, { moduleName: 'petShop' });
}

function issuesOf(map: NsE6JourneyMapArtifact, context: E6GateContext = presentationContext()) {
  return validateE6Invariants(map, context).issues;
}

void test('e6 presentation: a valid classification passes and survives prepare (schema accepts it)', async () => {
  const map = presentedMap({
    categoryRef: 'productCatalog', styleRef: 'salesforceStyle', confidence: 9,
    alternates: [{ categoryRef: 'operationsQueue', confidence: 4, reason: 'has a list' }],
    classificationNote: 'browse + reserve',
  });
  assert.deepEqual(map.workspaces[0].presentation, {
    categoryRef: 'productCatalog', styleRef: 'salesforceStyle', confidence: 9,
    classificationNote: 'browse + reserve',
    alternates: [{ categoryRef: 'operationsQueue', confidence: 4, reason: 'has a list' }],
  });
  const gate = await runNsGate({ stepId: 'e6-journey-map', schema: mapSchema, artifact: map, validate: item => validateE6Invariants(item, presentationContext()) });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(gate.warnings.some(issue => issue.code.startsWith('presentation.')), false, gate.warnings.map(issue => issue.code).join(', '));
});

void test('e6 presentation: an unknown categoryRef (or alternate) is an ERROR — the catalog is the source of truth', () => {
  const codes = issuesOf(presentedMap({ categoryRef: 'ghostCategory', confidence: 9 })).map(issue => issue.code);
  assert.ok(codes.includes('presentation.category.unknown'), codes.join(', '));

  const alternateCodes = issuesOf(presentedMap({
    categoryRef: 'productCatalog', confidence: 9, alternates: [{ categoryRef: 'ghostAlternate', confidence: 3 }],
  })).map(issue => issue.code);
  assert.ok(alternateCodes.includes('presentation.alternate.unknown'), alternateCodes.join(', '));
});

void test('e6 presentation: a category added to the catalog is accepted with NO code change', () => {
  const grown = parseNsCategoryCatalog({
    categories: [{ categoryId: 'brandNewShape', name: 'Brand New Shape', description: 'Added today.' }],
  })!;
  const issues = issuesOf(presentedMap({ categoryRef: 'brandNewShape', confidence: 8 }), presentationContext({ categoryCatalog: grown }));
  assert.equal(issues.some(issue => issue.code.startsWith('presentation.')), false, issues.map(issue => issue.code).join(', '));
});

void test('e6 presentation: missing classification warns, never blocks (optional in this phase)', () => {
  const issues = issuesOf(bffMap());
  const missing = issues.find(issue => issue.code === 'presentation.missing');
  assert.equal(missing?.severity, 'warning');
  assert.equal(issues.some(issue => issue.severity === 'error'), false);
});

void test('e6 presentation: an unreachable catalog warns ONCE and skips the checks; undefined is silent', () => {
  const unreachable = issuesOf(presentedMap({ categoryRef: 'ghostCategory', confidence: 9 }), presentationContext({ categoryCatalog: null }));
  assert.deepEqual(unreachable.filter(issue => issue.code.startsWith('presentation.')).map(issue => `${issue.severity}:${issue.code}`), ['warning:presentation.catalog.unavailable']);

  const notWired = issuesOf(presentedMap({ categoryRef: 'ghostCategory', confidence: 9 }), bffContext);
  assert.equal(notWired.some(issue => issue.code.startsWith('presentation.')), false);
});

void test('e6 presentation: a broken catalog is a configuration ERROR', () => {
  const broken = parseNsCategoryCatalog({
    categories: [
      { categoryId: 'dup', name: 'D', description: 'x' },
      { categoryId: 'dup', name: 'D2', description: 'x' },
      { categoryId: 'orphan', name: 'O', description: 'x', parentCategory: 'ghost' },
    ],
  })!;
  const codes = issuesOf(presentedMap({ categoryRef: 'dup', confidence: 9 }), presentationContext({ categoryCatalog: broken }))
    .filter(issue => issue.severity === 'error').map(issue => issue.code);
  assert.ok(codes.includes('catalog.category.duplicate'), codes.join(', '));
  assert.ok(codes.includes('catalog.parent.unknown'), codes.join(', '));
});

void test('e6 presentation: styleRef mismatch and low confidence are WARNINGS (a retry cannot fix run config)', () => {
  const styleIssue = issuesOf(presentedMap({ categoryRef: 'productCatalog', styleRef: 'ghostStyle', confidence: 9 }))
    .find(issue => issue.code === 'presentation.style.unknown');
  assert.equal(styleIssue?.severity, 'warning');
  // Unknown style set (no template folder discovered) => the check no-ops instead of crying wolf.
  assert.equal(issuesOf(presentedMap({ categoryRef: 'productCatalog', styleRef: 'ghostStyle', confidence: 9 }), presentationContext({ templateStyleRefs: [] }))
    .some(issue => issue.code === 'presentation.style.unknown'), false);

  const lowConfidence = issuesOf(presentedMap({ categoryRef: 'productCatalog', confidence: 4 }));
  assert.equal(lowConfidence.find(issue => issue.code === 'presentation.confidence.low')?.severity, 'warning');
  assert.equal(lowConfidence.some(issue => issue.severity === 'error'), false, 'confidence < 6 must never block the run');
});

void test('e6 presentation: coarse shape findings (read-only with command; queue without paginated)', () => {
  // bffMap()'s workspace HAS a command (reservar) → a read-only portal classification is suspicious.
  const readOnly = issuesOf(presentedMap({ categoryRef: 'readOnlyDetailPortal', confidence: 8 }))
    .find(issue => issue.code === 'presentation.shape.readOnlyHasCommand');
  assert.equal(readOnly?.severity, 'warning');

  // It HAS a paginated query, so operationsQueue is coherent...
  assert.equal(issuesOf(presentedMap({ categoryRef: 'operationsQueue', confidence: 8 }))
    .some(issue => issue.code === 'presentation.shape.queueNotPaginated'), false);
  // ...but drop the paginated output and the finding appears.
  const noPagination = presentedMap({ categoryRef: 'operationsQueue', confidence: 8 });
  noPagination.workspaces[0].bffCalls[0].output!.kind = 'list';
  assert.equal(issuesOf(noPagination).find(issue => issue.code === 'presentation.shape.queueNotPaginated')?.severity, 'warning');
});

void test('e6 presentation: a shape check NO-OPS when its category id left the catalog (single source of truth)', () => {
  // Same suspicious workspace, but a catalog where 'readOnlyDetailPortal' no longer exists: the id
  // check reports it as unknown, and the shape rule that names the id must NOT fire on its own.
  const renamed = parseNsCategoryCatalog({ categories: [{ categoryId: 'somethingElse', name: 'S', description: 'x' }] })!;
  const codes = issuesOf(presentedMap({ categoryRef: 'readOnlyDetailPortal', confidence: 8 }), presentationContext({ categoryCatalog: renamed }))
    .map(issue => issue.code);
  assert.ok(codes.includes('presentation.category.unknown'));
  assert.equal(codes.includes('presentation.shape.readOnlyHasCommand'), false, 'a rule naming a dead id must degrade to a no-op');
});

void test('e6 presentation: a dashboard whose primary surface is a write command is a finding', () => {
  const map = presentedMap({ categoryRef: 'dashboardCommandCenter', confidence: 7 });
  map.workspaces[0].sections[0].organisms[0] = { role: 'primarySurface', action: 'reservar' };
  assert.equal(issuesOf(map).find(issue => issue.code === 'presentation.shape.dashboardWriteSurface')?.severity, 'warning');
});

void test('e6 bffCall input carries source/sourceRef through prepare (T4 lint input)', () => {
  const map = bffMap();
  (map.workspaces[0].bffCalls[2] as unknown as Record<string, unknown>).input = [
    { name: 'productId', required: true, source: 'selection', sourceRef: 'productList' },
    { name: 'note', source: 'userDecision' },
    { name: 'bogus', source: 'notASource' },
  ];
  const prepared = prepareE6JourneyMap(map, { moduleName: 'petShop' });
  assert.deepEqual(prepared.workspaces[0].bffCalls[2].input, [
    { name: 'productId', required: true, source: 'selection', sourceRef: 'productList' },
    { name: 'note', source: 'userDecision' },
    { name: 'bogus' }, // an unknown source is DROPPED, never defaulted
  ]);
});

// ---------------------------------------------------------------------------
// required-id source (ajustesTemplates §2): decided at e6, where the fix is still cheap
// ---------------------------------------------------------------------------

function idSourceMap(input: unknown[]): NsE6JourneyMapArtifact {
  const map = bffMap();
  (map.workspaces[0].bffCalls[2] as unknown as Record<string, unknown>).input = input;
  return prepareE6JourneyMap(map, { moduleName: 'petShop' });
}

function idSourceCodes(input: unknown[], context: E6GateContext = bffContext): string[] {
  return validateE6Invariants(idSourceMap(input), context).issues
    .filter(issue => issue.code.startsWith('bff.input.idSource')).map(issue => issue.code);
}

void test('e6 gate: a required id with no source (or userDecision) is an ERROR the retry can fix', () => {
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string' }]), ['bff.input.idSourceMissing']);
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'userDecision' }]), ['bff.input.idSourceMissing']);
  const message = validateE6Invariants(idSourceMap([{ name: 'productId', required: true, type: 'string' }]), bffContext)
    .issues.find(issue => issue.code === 'bff.input.idSourceMissing')!.message;
  // The message must name BOTH legitimate ways out, or the retry cannot know what to do.
  assert.match(message, /source "selection" with sourceRef/);
  assert.match(message, /"pageInput" when the id arrives with the page/);
});

void test('e6 gate: selection must point at a query bffCall of THIS workspace', () => {
  // productList IS a query on this workspace — accepted.
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'selection', sourceRef: 'productList' }]), []);
  // reservar is a COMMAND, and ghostPicker does not exist — both unresolved.
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'selection', sourceRef: 'reservar' }]), ['bff.input.idSourceUnresolved']);
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'selection' }]), ['bff.input.idSourceUnresolved']);
});

void test('e6 gate: pageInput/actorSession need no ref; derived must start at a local bffCall', () => {
  // pageInput needs no sourceRef — but since T5 it does need a PROVIDER, checked over the whole map
  // (bff.input.pageInputUnfed below). This assertion is about the ref only.
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'pageInput' }]), []);
  assert.deepEqual(idSourceCodes([{ name: 'ownerId', required: true, type: 'string', source: 'actorSession' }]), []);
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'derived', sourceRef: 'productList.productId' }]), []);
  assert.deepEqual(idSourceCodes([{ name: 'productId', required: true, type: 'string', source: 'derived', sourceRef: 'ghostCall.productId' }]), ['bff.input.idSourceUnresolved']);
});

void test('e6 gate: the rule targets required IDS only — optional ids and typed non-ids pass', () => {
  assert.deepEqual(idSourceCodes([{ name: 'productId', type: 'string' }]), [], 'optional id');
  assert.deepEqual(idSourceCodes([{ name: 'quantity', required: true, type: 'number' }]), [], 'a required non-id is typed by the user');
});

// --- T2 (improveJourneys): landing self-sufficiency + any required input declares a source ---------

// The catalog workspace of bffMap() turned into the actor's LANDING. bffCalls[1] is a query
// (productDetail), bffCalls[2] a command (reservar) — the two shapes the rules treat differently.
function actorEntryMap(input: unknown[], callIndex: number): NsE6JourneyMapArtifact {
  const map = bffMap();
  (map.workspaces[0].bffCalls[callIndex] as unknown as Record<string, unknown>).input = input;
  map.landings = [{ actorId: 'cliente', workspaceId: 'catalog' }];
  return prepareE6JourneyMap(map, { moduleName: 'petShop' });
}

const T2_CODES = ['bff.input.sourceMissing', 'landing.requiresPageInput', 'landing.input.unresolved'];

function landingCodes(input: unknown[], callIndex = 1): string[] {
  return validateE6Invariants(actorEntryMap(input, callIndex), bffContext).issues
    .filter(issue => T2_CODES.includes(issue.code)).map(issue => issue.code);
}

/** The same page reached by navigation instead of being an actor's entry point (bffMap lands on it). */
function pageCodes(input: unknown[], callIndex = 1): string[] {
  const map = bffMap();
  (map.workspaces[0].bffCalls[callIndex] as unknown as Record<string, unknown>).input = input;
  map.landings = [];
  return validateE6Invariants(prepareE6JourneyMap(map, { moduleName: 'petShop' }), bffContext).issues
    .filter(issue => T2_CODES.includes(issue.code)).map(issue => issue.code);
}

void test('e6 gate T2: a required input with NO source is an error on any call, landing or not', () => {
  // The 102045 hole: a required id on a QUERY was outside the command-only id rule and passed e6 + e7.
  assert.deepEqual(pageCodes([{ name: 'projectId', required: true, type: 'string' }]), ['bff.input.sourceMissing']);
  // Non-id names too: "required" means someone has to provide it.
  assert.deepEqual(pageCodes([{ name: 'referenceDate', required: true, type: 'date' }]), ['bff.input.sourceMissing']);
  // Optional inputs are nobody's obligation.
  assert.deepEqual(pageCodes([{ name: 'projectId', type: 'string' }]), []);
});

void test('e6 gate T2: a required id on a command keeps ONE error, not two', () => {
  const issues = validateE6Invariants(actorEntryMap([{ name: 'productId', required: true, type: 'string' }], 2), bffContext).issues;
  const codes = issues.filter(issue => issue.code.startsWith('bff.input.') || issue.code.startsWith('landing.')).map(issue => issue.code);
  assert.deepEqual(codes, ['bff.input.idSourceMissing']); // the richer, older message owns this case
});

void test('e6 gate T2: a landing cannot require a pageInput — nothing navigates INTO a landing', () => {
  assert.deepEqual(landingCodes([{ name: 'productId', required: true, type: 'string', source: 'pageInput' }]), ['landing.requiresPageInput']);
  // Same input on a page that is NOT a landing stays legitimate (it arrives with the navigation).
  assert.deepEqual(pageCodes([{ name: 'productId', required: true, type: 'string', source: 'pageInput' }]), []);
});

void test('e6 gate T2: the landing message names the way out the model can act on', () => {
  const message = validateE6Invariants(actorEntryMap([{ name: 'productId', required: true, type: 'string', source: 'pageInput' }], 1), bffContext)
    .issues.find(issue => issue.code === 'landing.requiresPageInput')!.message;
  assert.match(message, /resolves the record from the actor's own context/); // the current/open record query
  assert.match(message, /actorSession/);
});

void test('e6 gate T2: a landing passes when the value resolves inside the page or from the session', () => {
  assert.deepEqual(landingCodes([{ name: 'productId', required: true, type: 'string', source: 'selection', sourceRef: 'productList' }]), []);
  assert.deepEqual(landingCodes([{ name: 'ownerId', required: true, type: 'string', source: 'actorSession' }]), []);
  assert.deepEqual(landingCodes([{ name: 'productId', required: true, type: 'string', source: 'derived', sourceRef: 'productList.productId' }]), []);
  assert.deepEqual(landingCodes([{ name: 'searchTerm', required: true, type: 'string', source: 'userDecision' }]), []);
});

void test('e6 gate T2: a landing reference that resolves nowhere local is an error even on a query', () => {
  assert.deepEqual(landingCodes([{ name: 'productId', required: true, type: 'string', source: 'selection', sourceRef: 'ghostPicker' }]), ['landing.input.unresolved']);
  assert.deepEqual(landingCodes([{ name: 'productId', required: true, type: 'string', source: 'derived', sourceRef: 'ghostCall.productId' }]), ['landing.input.unresolved']);
});

// The frozen 102045 run (the only baseline captured under the `source` contract) replayed through the
// REAL invariants: the two broken landings must be named and the two healthy ones must stay silent.
// cafeFlow/petShop predate `input.source` entirely — a source-based gate cannot judge them; their
// landings are covered by the structural M5 of the T0 ruler (cafeFlow 3/3 broken, petShop 0/2).
void test('e6 gate T2: replaying the 102045 baseline names exactly the landings that are broken', () => {
  const fixture = resolve(here, 'fixture/baseline/buildFlowFsm');
  const siteMap = JSON.parse(readFileSync(resolve(fixture, 'siteMap.json'), 'utf8')) as Record<string, never[]>;
  const classification = JSON.parse(readFileSync(resolve(fixture, 'e5-classification.json'), 'utf8')) as {
    workflows: { workflowId: string }[]; operations: { operationId: string; actorId: string; entity: string }[];
  };
  const workspaces = readdirSync(resolve(fixture, 'workspaces')).sort()
    .map(file => JSON.parse(readFileSync(resolve(fixture, 'workspaces', file), 'utf8')) as never);
  const artifact = { schemaVersion: '', moduleName: 'buildFlowFsm', note: '', workspaces, landings: siteMap.landings, navigationEdges: [] } as unknown as NsE6JourneyMapArtifact;
  const context: E6GateContext = {
    moduleName: 'buildFlowFsm',
    classificationWorkflowIds: classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: classification.operations.map(operation => operation.operationId),
    rosterActorIds: [...new Set(classification.operations.map(operation => operation.actorId))],
    entityIds: [...new Set(classification.operations.map(operation => operation.entity))],
    nowCapabilityActorIds: [],
    operationFacts: {},
  };
  const found = validateE6Invariants(artifact, context).issues
    .filter(issue => T2_CODES.includes(issue.code))
    .map(issue => `${issue.code}@${issue.path}`)
    .sort();
  assert.deepEqual(found, [
    'bff.input.sourceMissing@jobCostWorkspace',      // the billingStaff landing: projectId with no source at all
    'landing.requiresPageInput@clientStatusWorkspace', // the client landing: statusReportId waiting for a sender
  ]);
});

// --- T5 (improveJourneys): `pageInput` needs a creditor ------------------------------------------

// Two pages of the same actor, one navigating into the other. `list` displays productId and orderId;
// the edge is the shape that decides everything: which operation it navigates THROUGH.
function pageInputMap(input: {
  edgeOperationId?: string;
  toInputs: unknown[];
  fromActors?: string[];
  toActors?: string[];
}): NsE6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [
      {
        workspaceId: 'list', title: 'List', actors: input.fromActors || ['cliente'], kind: 'operation', entity: 'Product',
        purpose: 'Browse.',
        bffCalls: [{
          bffId: 'productList', kind: 'query', uses: [{ operationId: 'browseProducts' }],
          output: { kind: 'list', fields: [
            { name: 'productId', from: 'browseProducts.productId' },
            { name: 'orderId', from: 'browseProducts.orderId' },
          ] },
        }],
        sections: [{ sectionId: 's', intent: 'i', organisms: [{ role: 'primarySurface', dataSource: 'productList' }] }],
      },
      {
        workspaceId: 'detail', title: 'Detail', actors: input.toActors || ['cliente'], kind: 'operation', entity: 'Product',
        purpose: 'Act on one record.',
        bffCalls: [{ bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }], input: input.toInputs }],
        sections: [{ sectionId: 's', intent: 'i', organisms: [{ role: 'primarySurface', action: 'reservar' }] }],
      },
    ],
    landings: [],
    navigationEdges: [{ from: 'list', to: 'detail', operationId: input.edgeOperationId }],
  }, { moduleName: 'petShop' });
}

const pageInputContext = (facts: Record<string, Partial<NsE6OperationFact>>, pageContext?: E6GateContext['pageContext']): E6GateContext => ({
  ...bffContext,
  entityIds: ['Product', 'Order'],
  pageContext,
  operationFacts: Object.fromEntries(Object.entries(facts).map(([id, fact]) => [id, { ...bffFacts.browseProducts, ...fact } as NsE6OperationFact])),
});

const pageInputCodes = (map: NsE6JourneyMapArtifact, context: E6GateContext): string[] =>
  validateE6Invariants(map, context).issues.filter(issue => issue.code.startsWith('bff.input.pageInput')).map(issue => issue.code);

void test('e6 gate T5: a navigation carries what the page it comes from displays', () => {
  const map = pageInputMap({ edgeOperationId: 'viewProduct', toInputs: [{ name: 'productId', required: true, type: 'string', source: 'pageInput' }] });
  assert.deepEqual(pageInputCodes(map, pageInputContext({ viewProduct: { opKind: 'view', entity: 'Product' } })), []);
});

void test('e6 gate T5: an edge that CREATES a record cannot carry that record id, but still carries the context', () => {
  const facts = pageInputContext({ createOrder: { opKind: 'create', entity: 'Order' } });
  // The id of the record being created does not exist when the navigation is decided.
  const created = pageInputMap({ edgeOperationId: 'createOrder', toInputs: [{ name: 'orderId', required: true, type: 'string', source: 'pageInput' }] });
  assert.deepEqual(pageInputCodes(created, facts), ['bff.input.pageInputUnfed']);
  // The context the actor was already in travels with them on the SAME edge.
  const context = pageInputMap({ edgeOperationId: 'createOrder', toInputs: [{ name: 'productId', required: true, type: 'string', source: 'pageInput' }] });
  assert.deepEqual(pageInputCodes(context, facts), []);
});

void test('e6 gate T5: a handoff between actors is not a navigation — the other screen was never yours', () => {
  const map = pageInputMap({
    edgeOperationId: 'viewProduct',
    toInputs: [{ name: 'productId', required: true, type: 'string', source: 'pageInput' }],
    fromActors: ['cliente'], toActors: ['atendente'],
  });
  const context = { ...pageInputContext({ viewProduct: { opKind: 'view', entity: 'Product' } }), rosterActorIds: ['cliente', 'atendente'] };
  assert.deepEqual(pageInputCodes(map, context), ['bff.input.pageInputUnfed']);
});

void test('e6 gate T5: a journey declaring the record arriving is the other legitimate provider', () => {
  const map = pageInputMap({ edgeOperationId: 'createOrder', toInputs: [{ name: 'orderId', required: true, type: 'string', source: 'pageInput' }] });
  const facts = { createOrder: { opKind: 'create' as const, entity: 'Order' } };
  // Declared by the human at the e2 checkpoint: the actor arrives at this page with an Order chosen.
  assert.deepEqual(pageInputCodes(map, pageInputContext(facts, { entitiesByWorkspace: { detail: ['Order'] }, unresolvedByWorkspace: {} })), []);
  // Declared context that names something else does NOT cover it.
  assert.deepEqual(pageInputCodes(map, pageInputContext(facts, { entitiesByWorkspace: { detail: ['Product'] }, unresolvedByWorkspace: {} })), ['bff.input.pageInputUnfed']);
  // Declared context nobody could resolve to an entity: honestly unknown, never an invented error.
  assert.deepEqual(pageInputCodes(map, pageInputContext(facts, { entitiesByWorkspace: {}, unresolvedByWorkspace: { detail: ['o pedido'] } })), ['bff.input.pageInputUnverified']);
});

void test('e6 gate T5: an id whose name resolves to no declared entity is a warning, never an error', () => {
  const map = pageInputMap({ edgeOperationId: 'createOrder', toInputs: [{ name: 'assignedWorkerId', required: true, type: 'string', source: 'pageInput' }] });
  assert.deepEqual(pageInputCodes(map, pageInputContext({ createOrder: { opKind: 'create', entity: 'Order' } })), ['bff.input.pageInputUnverified']);
});

void test('e6 gate T5: the check is skipped while a single workspace is validated in isolation', () => {
  const map = pageInputMap({ edgeOperationId: 'createOrder', toInputs: [{ name: 'orderId', required: true, type: 'string', source: 'pageInput' }] });
  const scoped = { ...pageInputContext({ createOrder: { opKind: 'create', entity: 'Order' } }), wholeMap: false };
  assert.deepEqual(pageInputCodes(map, scoped), []);
});

// The frozen 102045 run replayed through the REAL invariants: the acceptance list of improveJourneys
// T5, verbatim. What must PASS matters as much as what must fail — `cmdCreateChangeOrder.projectId`
// arrives on the very same edge that cannot carry `changeOrderId`.
void test('e6 gate T5: replaying the 102045 baseline names exactly the unfed pageInputs', () => {
  const fixture = resolve(here, 'fixture/baseline/buildFlowFsm');
  const siteMap = JSON.parse(readFileSync(resolve(fixture, 'siteMap.json'), 'utf8')) as Record<string, never[]>;
  const classification = JSON.parse(readFileSync(resolve(fixture, 'e5-classification.json'), 'utf8')) as {
    workflows: { workflowId: string }[]; operations: { operationId: string; actorId: string; entity: string; kind: string }[];
  };
  const workspaces = readdirSync(resolve(fixture, 'workspaces')).sort()
    .map(file => JSON.parse(readFileSync(resolve(fixture, 'workspaces', file), 'utf8')) as never);
  const operationFacts: Record<string, NsE6OperationFact> = {};
  for (const operation of classification.operations) {
    operationFacts[operation.operationId] = {
      accessPatternKind: 'commandInput', selection: 'none',
      opKind: operation.kind as NsE6OperationFact['opKind'], hasPublicInput: false,
      actors: [operation.actorId], inputNames: [], outputTopPaths: [], outputItemPaths: [], entity: operation.entity,
    };
  }
  const artifact = { schemaVersion: '', moduleName: 'buildFlowFsm', note: '', workspaces, landings: siteMap.landings, navigationEdges: siteMap.navigationEdges } as unknown as NsE6JourneyMapArtifact;
  const context: E6GateContext = {
    moduleName: 'buildFlowFsm',
    classificationWorkflowIds: classification.workflows.map(workflow => workflow.workflowId),
    classificationOperationIds: classification.operations.map(operation => operation.operationId),
    rosterActorIds: [...new Set(classification.operations.map(operation => operation.actorId))],
    entityIds: [...new Set(classification.operations.map(operation => operation.entity))],
    nowCapabilityActorIds: [], operationFacts,
  };
  const found = validateE6Invariants(artifact, context).issues
    .filter(issue => issue.code.startsWith('bff.input.pageInput'))
    .map(issue => `${issue.code}@${issue.message.match(/bffCall (\w+): required id "(\w+)"/)?.slice(1).join('.')}`)
    .sort();
  assert.deepEqual(found, [
    'bff.input.pageInputUnfed@cmdUpdateChangeOrder.changeOrderId',        // the symptom that opened the investigation
    'bff.input.pageInputUnfed@cmdUpdateChangeOrderStatus.changeOrderId',
    'bff.input.pageInputUnfed@getBillingSummary.billingSummaryId',        // reachable only across a handoff
    'bff.input.pageInputUnfed@getInvoice.invoiceId',
    'bff.input.pageInputUnfed@listDelayRiskSuggestions.statusReportId',   // a page whose own context is projectId
    'bff.input.pageInputUnfed@submitVoidMaterialUsage.materialUsageId',   // voids with no list anywhere
    'bff.input.pageInputUnfed@submitVoidTimeLog.timeLogId',
    'bff.input.pageInputUnfed@triggerDelayRiskSuggestions.statusReportId',
    'bff.input.pageInputUnfed@updateProjectCmd.projectId',                // twin of the changeOrder defect
    'bff.input.pageInputUnfed@updateProjectStatusCmd.projectId',
  ]);
  // MUST PASS: the same edge that cannot carry changeOrderId does carry the project you came from,
  // and the field worker's workTaskId arrives from the task list they selected it in.
  const passing = validateE6Invariants(artifact, context).issues.filter(issue =>
    /cmdCreateChangeOrder|cmdUpdateWorkTask|generateReport/.test(issue.message) && issue.code.startsWith('bff.input.pageInput'));
  assert.deepEqual(passing, []);
});

// Run 102046 (03/08): the detail tool schema had `bffField.item.fields.items.$ref -> bffField`, a
// SELF-REFERENCE with no bound. One provider recursed item.fields → item.fields → … until it hit
// max_output_tokens (48k output tokens, 84s, TOOL_ARGS_SCHEMA), so 5 of 10 workspaces never returned
// and the run hung. The projection is two levels — the third must be INEXPRESSIBLE, not discouraged.
void test('e6 schema: the output projection cannot nest a third level', () => {
  const schema = JSON.parse(readFileSync(resolve(here, '../../schemas/e6-workspace.schema.json'), 'utf8')) as {
    $defs: Record<string, { properties: Record<string, unknown> }>;
  };
  const field = schema.$defs.bffField.properties.item as { properties: { fields: { items: { $ref: string } } } };
  assert.equal(field.properties.fields.items.$ref, '#/$defs/bffItemField', 'item columns must be leaves');
  assert.equal(schema.$defs.bffItemField.properties.item, undefined, 'a leaf column has no item of its own');
  // And no definition may point back at a container: that is the shape that recursed forever.
  assert.doesNotMatch(JSON.stringify(schema.$defs.bffItemField), /\$ref/);
});

// --- run 102046 (03/08): the label-in-`action` swap ------------------------------------------------

// VERBATIM from the projectOverview detail, third attempt — the same shape on all three, and 24 of the
// run's 43 detail-gate errors. The model reads `action` as the button's text and `dataSource` as "the
// call behind it"; the contract is action=command bffId, dataSource=query bffId.
function swappedOrganismMap(): NsE6JourneyMapArtifact {
  return prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'projectOverview', title: 'Project overview', actors: ['cliente'], kind: 'operation',
      entity: 'Product', purpose: 'Browse projects and act on the selected one.',
      bffCalls: [
        { bffId: 'productList', kind: 'query', uses: [{ operationId: 'browseProducts' }] },
        { bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
      ],
      sections: [{
        sectionId: 'projectsAndOperations', intent: 'Browse and act',
        organisms: [
          { role: 'primarySurface', action: 'Browse and select projects', dataSource: 'productList' },
          { role: 'contextualAction', action: 'Create a project baseline', dataSource: 'reservar' },
        ],
      }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
}

void test('e6 repair: a command in dataSource with a label in action is the pair swapped', () => {
  const organisms = repairE6OrganismReferences(swappedOrganismMap()).workspaces[0].sections[0].organisms;
  // The label on a valid query surface is text, not a reference: dropped, dataSource untouched.
  assert.deepEqual(organisms[0], { role: 'primarySurface', dataSource: 'productList' });
  // The command moves to where the contract puts it.
  assert.deepEqual(organisms[1], { role: 'contextualAction', action: 'reservar' });
});

void test('e6 repair: it only fixes what it can prove, and never touches a valid organism', () => {
  const map = swappedOrganismMap();
  const organisms = map.workspaces[0].sections[0].organisms;
  organisms[0] = { role: 'primarySurface', dataSource: 'productList' };          // already correct
  organisms[1] = { role: 'contextualAction', action: 'ghostCall' };              // unprovable: no dataSource to swap
  const repaired = repairE6OrganismReferences(map).workspaces[0].sections[0].organisms;
  assert.deepEqual(repaired[0], { role: 'primarySurface', dataSource: 'productList' });
  assert.deepEqual(repaired[1], { role: 'contextualAction', action: 'ghostCall' }, 'left for the gate to report');
});

void test('e6 repair: running it twice changes nothing more', () => {
  const once = repairE6OrganismReferences(swappedOrganismMap());
  const twice = repairE6OrganismReferences(repairE6OrganismReferences(swappedOrganismMap()));
  assert.deepEqual(twice.workspaces[0].sections, once.workspaces[0].sections);
});

void test('e6 repair: the repaired organisms pass the gate that was rejecting them', () => {
  const before = validateE6Invariants(swappedOrganismMap(), bffContext).issues
    .filter(issue => issue.code.startsWith('organism.reference'));
  assert.ok(before.length > 0, 'the raw shape must be rejected');
  const after = validateE6Invariants(repairE6OrganismReferences(swappedOrganismMap()), bffContext).issues
    .filter(issue => issue.code.startsWith('organism.reference'));
  assert.deepEqual(after, []);
});

// VERBATIM from delayRiskReview (run 102046/run04, third attempt): a command-only page whose `action`
// was already correct, rejected because the optional `dataSource` carried the word "none".
void test('e6 repair: a "no value" word in a reference field is not a reference', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'delayRiskReview', title: 'Delay risk', actors: ['cliente'], kind: 'operation',
      entity: 'Product', purpose: 'Generate and review suggestions.',
      bffCalls: [
        { bffId: 'generateCall', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
        { bffId: 'reviewCall', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
      ],
      sections: [{
        sectionId: 'suggestions', intent: 'Generate and review',
        organisms: [
          { role: 'primarySurface', dataSource: 'none', action: 'generateCall' },
          { role: 'contextualAction', dataSource: 'NONE', action: 'reviewCall' },
        ],
      }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const organisms = repairE6OrganismReferences(map).workspaces[0].sections[0].organisms;
  // The placeholder goes; the command-form surface the gate already supports stays intact.
  assert.deepEqual(organisms[0], { role: 'primarySurface', action: 'generateCall' });
  assert.deepEqual(organisms[1], { role: 'contextualAction', action: 'reviewCall' });
});

void test('e6 repair: a real bffCall is never mistaken for a placeholder', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'edge', title: 'Edge', actors: ['cliente'], kind: 'operation', entity: 'Product', purpose: 'p',
      bffCalls: [{ bffId: 'none', kind: 'query', uses: [{ operationId: 'browseProducts' }] }],
      sections: [{ sectionId: 's', intent: 'i', organisms: [{ role: 'primarySurface', dataSource: 'none' }] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const organisms = repairE6OrganismReferences(map).workspaces[0].sections[0].organisms;
  assert.deepEqual(organisms[0], { role: 'primarySurface', dataSource: 'none' }, 'it resolves, so it stays');
});

// --- actorDirectory: a person is not a record -----------------------------------------------------

// Run 102046/run04: `assignWorkTask.responsibleFieldWorkerId` had no legal source. The module declares
// 11 entities and none is a person, so no query can list field workers — `selection` was impossible,
// nothing carried the id (`pageInput`), it is the ASSIGNEE not the logged-in user (`actorSession`), and
// no local call produced it (`derived`). The model burned three attempts on a corner with no way out.
const actorCtx: E6GateContext = { ...bffContext, rosterActorIds: ['cliente', 'fieldWorker'], entityIds: ['Product', 'Highlight'] };

void test('e6 gate: a required id naming a person resolves through the actor directory', () => {
  assert.deepEqual(idSourceCodes([{ name: 'responsibleFieldWorkerId', required: true, type: 'string', source: 'actorDirectory', sourceRef: 'fieldWorker' }], actorCtx), []);
});

void test('e6 gate: the directory must name WHICH role — it is a reference, not a free pass', () => {
  assert.deepEqual(idSourceCodes([{ name: 'responsibleFieldWorkerId', required: true, type: 'string', source: 'actorDirectory' }], actorCtx), ['bff.input.idSourceUnresolved']);
  assert.deepEqual(idSourceCodes([{ name: 'responsibleFieldWorkerId', required: true, type: 'string', source: 'actorDirectory', sourceRef: 'ghostRole' }], actorCtx), ['bff.input.idSourceUnresolved']);
});

void test('e6 gate: an id that DOES name a declared entity is picked from a query, never the directory', () => {
  const issues = validateE6Invariants(idSourceMap([{ name: 'productId', required: true, type: 'string', source: 'actorDirectory', sourceRef: 'cliente' }]), actorCtx).issues;
  assert.deepEqual(issues.filter(i => i.code.startsWith('bff.input.')).map(i => i.code), ['bff.input.actorDirectoryOnRecord']);
});

void test('e6 gate: the message on a sourceless id names the person way out, or the retry cannot find it', () => {
  const message = validateE6Invariants(idSourceMap([{ name: 'productId', required: true, type: 'string' }]), actorCtx)
    .issues.find(issue => issue.code === 'bff.input.idSourceMissing')!.message;
  assert.match(message, /actorDirectory/);
  assert.match(message, /names a PERSON/);
});

// VERBATIM from statusUpdates (run 102046/run05): a command-only page where the model filled BOTH
// fields with the SAME command. The first version of this repair skipped it — `action` was a valid
// bffId, so it returned early and left the bogus `dataSource` behind, and the page died on
// `organism.reference.kind` after three attempts.
void test('e6 repair: the same command in both fields leaves only the action', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'statusUpdates', title: 'Status', actors: ['cliente'], kind: 'operation',
      entity: 'Product', purpose: 'Generate and share reports.',
      bffCalls: [
        { bffId: 'generateReport', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
        { bffId: 'shareReport', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
      ],
      sections: [{
        sectionId: 's', intent: 'i',
        organisms: [
          { role: 'primarySurface', dataSource: 'generateReport', action: 'generateReport' },
          { role: 'contextualAction', dataSource: 'shareReport', action: 'shareReport' },
        ],
      }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const organisms = repairE6OrganismReferences(map).workspaces[0].sections[0].organisms;
  assert.deepEqual(organisms[0], { role: 'primarySurface', action: 'generateReport' });
  assert.deepEqual(organisms[1], { role: 'contextualAction', action: 'shareReport' });
});

// --- P2: picker vs surface -------------------------------------------------------------------------

// The distinction the supervisor's answer turns on: a query over the page's OWN entity is the
// master-detail surface every healthy page in the baseline has; a query over ANOTHER entity, pointed at
// by a `selection` input, exists to fill a field. Both facts are already in the l4, so code decides.
function pickerMap(input: { ownQuery?: boolean; selects?: boolean; surface?: boolean } = {}): NsE6JourneyMapArtifact {
  const calls: Record<string, unknown>[] = [
    { bffId: 'materialList', kind: 'query', uses: [{ operationId: 'browseProducts' }] },
    { bffId: 'logUsage', kind: 'command', uses: [{ operationId: 'reserveProduct' }],
      input: input.selects === false ? [] : [{ name: 'productId', required: true, type: 'string', source: 'selection', sourceRef: 'materialList' }] },
  ];
  if (input.ownQuery) calls.unshift({ bffId: 'usageList', kind: 'query', uses: [{ operationId: 'viewProduct' }] });
  return prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'fieldWorkLog', title: 'Field work', actors: ['cliente'], kind: 'operation', entity: 'Highlight',
      purpose: 'Log usage.', bffCalls: calls,
      sections: [{ sectionId: 's', intent: 'i', organisms: [
        { role: 'primarySurface', dataSource: input.surface ? 'materialList' : 'usageList' },
        { role: 'contextualAction', action: 'logUsage' },
      ] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
}

// browseProducts is over Product; the workspace entity is Highlight -> foreign. viewProduct is stubbed
// as the page's own entity below via the facts.
const pickerContext: E6GateContext = {
  ...bffContext,
  entityIds: ['Product', 'Highlight'],
  operationFacts: {
    ...bffFacts,
    browseProducts: { ...bffFacts.browseProducts, entity: 'Product' },
    viewProduct: { ...bffFacts.viewProduct, entity: 'Highlight' },
    reserveProduct: { ...bffFacts.reserveProduct, entity: 'Highlight' },
  },
};

void test('e6 P2: a foreign query feeding a selection is stamped a picker; the own-entity query is not', () => {
  const stamped = stampE6PickerUsage(pickerMap({ ownQuery: true }), pickerContext).workspaces[0];
  assert.equal(stamped.bffCalls.find(call => call.bffId === 'materialList')?.usage, 'picker');
  assert.equal(stamped.bffCalls.find(call => call.bffId === 'usageList')?.usage, undefined, 'the page own list stays a surface');
});

void test('e6 P2: a foreign query nobody selects from is not a picker', () => {
  const stamped = stampE6PickerUsage(pickerMap({ ownQuery: true, selects: false }), pickerContext).workspaces[0];
  assert.equal(stamped.bffCalls.find(call => call.bffId === 'materialList')?.usage, undefined);
});

void test('e6 P2: the stamp is idempotent and self-correcting', () => {
  const once = stampE6PickerUsage(pickerMap({ ownQuery: true }), pickerContext);
  const twice = stampE6PickerUsage(stampE6PickerUsage(pickerMap({ ownQuery: true }), pickerContext), pickerContext);
  assert.deepEqual(twice.workspaces[0].bffCalls, once.workspaces[0].bffCalls);
  // A stale stamp from a previous shape is removed when nothing selects from it any more.
  const stale = pickerMap({ ownQuery: true, selects: false });
  stale.workspaces[0].bffCalls.find(call => call.bffId === 'materialList')!.usage = 'picker';
  assert.equal(stampE6PickerUsage(stale, pickerContext).workspaces[0].bffCalls.find(call => call.bffId === 'materialList')?.usage, undefined);
});

void test('e6 P2 gate: a picker cannot be the section primarySurface', () => {
  const codes = validateE6Invariants(stampE6PickerUsage(pickerMap({ surface: true }), pickerContext), pickerContext)
    .issues.filter(issue => issue.code.startsWith('bff.picker')).map(issue => issue.code);
  assert.deepEqual(codes, ['bff.picker.asPrimarySurface']);
});

void test('e6 P2 gate: a picker nobody selects from is a warning, not an error', () => {
  const stale = pickerMap({ ownQuery: true, selects: false });
  stale.workspaces[0].bffCalls.find(call => call.bffId === 'materialList')!.usage = 'picker';
  const issues = validateE6Invariants(stale, pickerContext).issues.filter(issue => issue.code.startsWith('bff.picker'));
  assert.deepEqual(issues.map(issue => [issue.code, issue.severity]), [['bff.picker.unreferenced', 'warning']]);
});

// VERBATIM from fieldExecutionWorkspace.viewMyAssignmentsQuery (run07): the row's columns were nested
// one level too deep, under the first column — a `workTaskId` STRING carrying an `item.fields` with the
// whole row. The contract emitter throws on it ("nesting > 1 level not supported"), and an exception is
// the one thing no gate can soften, so the run died at e7 after a complete e6.
void test('e6 repair: a third projection level is lifted into the row it belongs to', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'fieldExecution', title: 'Field', actors: ['cliente'], kind: 'operation', entity: 'Product',
      purpose: 'p',
      bffCalls: [{
        bffId: 'viewMyAssignmentsQuery', kind: 'query', uses: [{ operationId: 'browseProducts' }],
        output: { kind: 'paginated', fields: [
          { name: 'myAssignments', type: 'array', from: 'browseProducts.$items', item: { fields: [
            { name: 'workTaskId', from: 'browseProducts.$items.workTaskId', type: 'string', required: true, item: { fields: [
              { name: 'workTaskId', from: 'browseProducts.$items.workTaskId', type: 'string', required: true },
              { name: 'projectName', from: 'browseProducts.$items.projectName', type: 'string', required: true },
            ] } },
          ] } },
          { name: 'total', from: 'browseProducts.total' },
        ] },
      }],
      sections: [{ sectionId: 's', intent: 'i', organisms: [{ role: 'primarySurface', dataSource: 'viewMyAssignmentsQuery' }] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const output = repairE6OutputNesting(map).workspaces[0].bffCalls[0].output!;
  const columns = output.fields[0].item!.fields;
  // The columns are lifted, deduped, and no column carries rows of its own any more.
  assert.deepEqual(columns.map(field => field.name), ['workTaskId', 'projectName']);
  assert.ok(columns.every(field => field.item === undefined));
  assert.equal(output.fields[1].name, 'total', 'the envelope is untouched');
});

void test('e6 repair: a legitimate two-level projection is left exactly as it is', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'ok', title: 'Ok', actors: ['cliente'], kind: 'operation', entity: 'Product', purpose: 'p',
      bffCalls: [{
        bffId: 'list', kind: 'query', uses: [{ operationId: 'browseProducts' }],
        output: { kind: 'paginated', fields: [
          { name: 'rows', type: 'array', from: 'browseProducts.$items', item: { fields: [
            { name: 'productId', from: 'browseProducts.$items.productId' },
            { name: 'name', from: 'browseProducts.$items.name' },
          ] } },
          { name: 'total', from: 'browseProducts.total' },
        ] },
      }],
      sections: [{ sectionId: 's', intent: 'i', organisms: [{ role: 'primarySurface', dataSource: 'list' }] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const before = JSON.stringify(map.workspaces[0].bffCalls[0].output);
  assert.equal(JSON.stringify(repairE6OutputNesting(map).workspaces[0].bffCalls[0].output), before);
});

// run07: three contextualActions came back with `dataSource` = a query and `action` = a label. The
// repair deleted the label, leaving a command role with NO command — an error strictly worse than the
// one it replaced, because `organism.reference.unknown` at least names the bffCalls to choose from.
void test('e6 repair: a role that REQUIRES an action keeps its unusable one for the gate to name', () => {
  const map = prepareE6JourneyMap({
    workspaces: [{
      workspaceId: 'projects', title: 'Projects', actors: ['cliente'], kind: 'operation', entity: 'Product',
      purpose: 'p',
      bffCalls: [
        { bffId: 'productList', kind: 'query', uses: [{ operationId: 'browseProducts' }] },
        { bffId: 'reservar', kind: 'command', uses: [{ operationId: 'reserveProduct' }] },
      ],
      sections: [{ sectionId: 's', intent: 'i', organisms: [
        { role: 'primarySurface', action: 'Browse the projects', dataSource: 'productList' },
        { role: 'contextualAction', action: 'Pick a client', dataSource: 'productList' },
      ] }],
    }],
    landings: [], navigationEdges: [],
  }, { moduleName: 'petShop' });
  const organisms = repairE6OrganismReferences(map).workspaces[0].sections[0].organisms;
  assert.deepEqual(organisms[0], { role: 'primarySurface', dataSource: 'productList' }, 'a surface label is text: dropped');
  assert.equal(organisms[1].action, 'Pick a client', 'a command role keeps it — the gate names the candidates');
});
