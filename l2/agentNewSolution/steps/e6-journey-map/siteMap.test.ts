/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  E6SiteMapGateContext,
  NsE6SiteMapArtifact,
  computeE6WorkspaceSliceHash,
  deriveE6SiteMapKinds,
  prepareE6SiteMap,
  repairE6SiteMapColocation,
  validateE6SiteMap,
  validateE6WorkspaceEquality,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/siteMap.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '../../schemas/e6-sitemap.schema.json'), 'utf8')) as Record<string, unknown>;

const context: E6SiteMapGateContext = {
  moduleName: 'petShop',
  classificationWorkflowIds: ['reservationLifecycle'],
  classificationOperationIds: ['browseCatalog', 'viewProductDetail', 'createReservation', 'browseHighlights'],
  rosterActorIds: ['cliente', 'atendente'],
  entityIds: ['Product', 'Reservation', 'FeaturedProduct'],
  nowCapabilityActorIds: ['cliente'],
  operationOwnerWorkflow: { createReservation: 'reservationLifecycle' },
  operationKind: { browseCatalog: 'query', viewProductDetail: 'view', createReservation: 'create', browseHighlights: 'query' },
  operationEntity: { browseCatalog: 'Product', viewProductDetail: 'Product', createReservation: 'Reservation', browseHighlights: 'FeaturedProduct' },
  operationActors: { browseCatalog: ['cliente'], viewProductDetail: ['cliente'], createReservation: ['cliente'], browseHighlights: ['cliente'] },
};

function validMap(): NsE6SiteMapArtifact {
  return deriveE6SiteMapKinds(prepareE6SiteMap({
    workspaces: [
      { workspaceId: 'catalog', title: 'Catálogo', actors: ['cliente'], kind: 'workflow', entity: 'Product', operationIds: ['browseCatalog', 'viewProductDetail', 'createReservation'], purpose: 'Buscar e reservar produtos.' },
      { workspaceId: 'home', title: 'Início', actors: ['cliente'], kind: 'landing', entity: 'FeaturedProduct', operationIds: ['browseHighlights'], purpose: 'Descobrir destaques ao entrar.' },
    ],
    landings: [{ actorId: 'cliente', workspaceId: 'home' }],
    navigationEdges: [{ from: 'home', to: 'catalog' }],
  }, { moduleName: 'petShop' }), context);
}

async function gateOf(map: NsE6SiteMapArtifact) {
  return runNsGate({ stepId: 'e6-journey-map', schema, artifact: map, validate: item => validateE6SiteMap(item, context) });
}

void test('siteMap gate passes on a valid partition and derives the workflow kind', async () => {
  const map = validMap();
  assert.equal(map.workspaces[0].kind, 'workflow'); // createReservation is workflow-owned
  const gate = await gateOf(map);
  assert.equal(gate.ok, true, gate.errors.map(i => i.message).join('; '));
});

void test('siteMap gate blocks an operation covered by no workspace (partition incomplete)', async () => {
  const map = validMap();
  map.workspaces[0].operationIds = ['browseCatalog', 'viewProductDetail']; // drop createReservation
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(i => i.code === 'siteMap.operation.unassigned'));
});

void test('siteMap gate blocks an unknown operation and a duplicated workspaceId', async () => {
  const map = validMap();
  map.workspaces[0].operationIds.push('ghostOp');
  map.workspaces.push({ ...map.workspaces[1], workspaceId: 'catalog' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(i => i.code === 'siteMap.operation.unknown'));
  assert.ok(gate.errors.some(i => i.code === 'siteMap.workspace.id.duplicate'));
});

// Run12 replay (kitchenQueue): the slice declared actors [cozinheiro] but hosted updateOrderStatus,
// whose defs also serve "atendente". The detail phase copies actors verbatim, so this MUST fail at
// phase 1 (retryable) — deferring it to finalize burns every repair round deterministically.
void test('siteMap gate blocks a workspace whose actors do not cover a hosted operation (run12 kitchenQueue)', async () => {
  const map = validMap();
  const kitchenContext: E6SiteMapGateContext = {
    ...context,
    operationActors: { ...context.operationActors, createReservation: ['cliente', 'atendente'] },
  };
  const gate = await runNsGate({ stepId: 'e6-journey-map', schema, artifact: map, validate: item => validateE6SiteMap(item, kitchenContext) });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(i => i.code === 'siteMap.actors.notCovering' && i.message.includes('"atendente"')));
});

void test('siteMap gate blocks a landing pointing at an undeclared workspace', async () => {
  const map = validMap();
  map.landings.push({ actorId: 'cliente', workspaceId: 'ghost' });
  const gate = await gateOf(map);
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(i => i.code === 'siteMap.landing.workspace.unknown'));
});

void test('validateE6WorkspaceEquality flags a detail that diverges from its map slice', () => {
  const slice = validMap().workspaces[0];
  const ok = validateE6WorkspaceEquality({ workspaceId: 'catalog', title: 'Catálogo', actors: ['cliente'], kind: 'workflow', operationIds: ['browseCatalog', 'viewProductDetail', 'createReservation'] }, slice);
  assert.equal(ok.length, 0);
  const bad = validateE6WorkspaceEquality({ workspaceId: 'catalog', title: 'Outro', actors: ['atendente'], kind: 'operation', operationIds: ['browseCatalog'] }, slice);
  assert.ok(bad.some(i => i.code === 'detail.title.mismatch'));
  assert.ok(bad.some(i => i.code === 'detail.actors.mismatch'));
  assert.ok(bad.some(i => i.code === 'detail.kind.mismatch'));
  assert.ok(bad.some(i => i.code === 'detail.operationIds.mismatch'));
});

void test('computeE6WorkspaceSliceHash is stable and slice-sensitive', () => {
  const slice = validMap().workspaces[0];
  const h1 = computeE6WorkspaceSliceHash(slice);
  const h2 = computeE6WorkspaceSliceHash({ ...slice, operationIds: [...slice.operationIds].reverse() });
  assert.equal(h1, h2); // order-insensitive
  const h3 = computeE6WorkspaceSliceHash({ ...slice, purpose: 'changed' });
  assert.notEqual(h1, h3); // a real slice change moves the hash
});

// --- P2: co-location -------------------------------------------------------------------------------

// The 102046/run05 shape: `fieldWorkLog` hosts createMaterialUsage (needs materialId) but the material
// listing lives in `materialCatalog`. The gate demands a picker over an operation THIS page hosts, so
// the model was cornered — three attempts, no way out.
function colocationContext(overrides: Partial<E6SiteMapGateContext> = {}): E6SiteMapGateContext {
  return {
    moduleName: 'buildFlowFsm',
    classificationWorkflowIds: [],
    classificationOperationIds: ['createMaterialUsage', 'browseMaterials', 'queryAssignedWorkTasks', 'createMaterial'],
    rosterActorIds: ['fieldWorker', 'projectManager'],
    entityIds: ['Material', 'WorkTask', 'MaterialUsage'],
    nowCapabilityActorIds: [],
    operationOwnerWorkflow: {},
    operationKind: { createMaterialUsage: 'create', browseMaterials: 'query', queryAssignedWorkTasks: 'query', createMaterial: 'create' },
    operationEntity: { createMaterialUsage: 'MaterialUsage', browseMaterials: 'Material', queryAssignedWorkTasks: 'WorkTask', createMaterial: 'Material' },
    operationActors: {},
    operationRequiredIdInputs: { createMaterialUsage: ['materialId'] },
    operationAccessPattern: { browseMaterials: 'list', queryAssignedWorkTasks: 'list' },
    ...overrides,
  };
}

function colocationMap(edges: Record<string, unknown>[] = []): NsE6SiteMapArtifact {
  return prepareE6SiteMap({
    workspaces: [
      { workspaceId: 'fieldWorkLog', title: 'Field work', actors: ['fieldWorker'], kind: 'operation', entity: 'MaterialUsage',
        operationIds: ['createMaterialUsage', 'queryAssignedWorkTasks'], purpose: 'Log the work done.' },
      { workspaceId: 'materialCatalog', title: 'Materials', actors: ['projectManager'], kind: 'entityManagement', entity: 'Material',
        operationIds: ['browseMaterials', 'createMaterial'], purpose: 'Maintain the catalog.' },
    ],
    landings: [],
    navigationEdges: edges,
  }, { moduleName: 'buildFlowFsm' });
}

void test('P2: the listing of the record a command needs is co-located on the page that needs it', () => {
  const { artifact, added } = repairE6SiteMapColocation(colocationMap(), colocationContext(), { carriedEntities: {} });
  assert.deepEqual(added, [{ workspaceId: 'fieldWorkLog', operationId: 'browseMaterials', forInput: 'materialId', entity: 'Material' }]);
  assert.ok(artifact.workspaces[0].operationIds.includes('browseMaterials'));
  // The catalog keeps it too: one usecase serving two BFF calls is what the BFF layer is for.
  assert.ok(artifact.workspaces[1].operationIds.includes('browseMaterials'));
});

void test('P2: nothing is co-located when the id already resolves', () => {
  const already = colocationMap();
  already.workspaces[0].operationIds.push('browseMaterials'); // the page already reads Material
  assert.deepEqual(repairE6SiteMapColocation(already, colocationContext(), { carriedEntities: {} }).added, []);

  // A journey declares the actor arriving with the material chosen.
  assert.deepEqual(repairE6SiteMapColocation(colocationMap(), colocationContext(),
    { carriedEntities: { fieldWorkLog: ['Material'] } }).added, []);

  // A navigation from a page of the same actor that displays materials carries it.
  const shared = colocationMap([{ from: 'materialCatalog', to: 'fieldWorkLog', operationId: 'browseMaterials' }]);
  shared.workspaces[1].actors = ['fieldWorker'];
  assert.deepEqual(repairE6SiteMapColocation(shared, colocationContext(), { carriedEntities: {} }).added, []);
});

void test('P2: an edge that goes there to CREATE the record does not carry its id', () => {
  const creating = colocationMap([{ from: 'materialCatalog', to: 'fieldWorkLog', operationId: 'createMaterial' }]);
  creating.workspaces[1].actors = ['fieldWorker'];
  assert.deepEqual(repairE6SiteMapColocation(creating, colocationContext(), { carriedEntities: {} }).added.length, 1);
});

void test('P2: an id that names no declared entity is left alone (it is a person, not a record)', () => {
  const context = colocationContext({ operationRequiredIdInputs: { createMaterialUsage: ['responsibleFieldWorkerId'] } });
  assert.deepEqual(repairE6SiteMapColocation(colocationMap(), context, { carriedEntities: {} }).added, []);
});

void test('P2: co-locating a READ never changes the page kind', () => {
  // The receiver keeps the kind it had — nothing about a foreign READ creates own-entity create+update.
  const plain = repairE6SiteMapColocation(colocationMap(), colocationContext(), { carriedEntities: {} }).artifact;
  assert.equal(deriveE6SiteMapKinds(plain, colocationContext()).workspaces[0].kind, 'operation');

  // And an entityManagement page STAYS entityManagement: that is the `foreignReadOnly` tolerance of
  // 07/11 doing exactly the job co-location needs — a foreign query is read-only, so it cannot demote.
  const managed = colocationMap();
  managed.workspaces[0].operationIds.push('updateMaterialUsage');
  const context = colocationContext({
    classificationOperationIds: [...colocationContext().classificationOperationIds, 'updateMaterialUsage'],
    operationKind: { ...colocationContext().operationKind, updateMaterialUsage: 'update' },
    operationEntity: { ...colocationContext().operationEntity, updateMaterialUsage: 'MaterialUsage' },
  });
  assert.equal(deriveE6SiteMapKinds(colocationMap(), context).workspaces[0].kind, 'operation', 'without update it is not management');
  const before = deriveE6SiteMapKinds(managed, context).workspaces[0].kind;
  assert.equal(before, 'entityManagement');
  const after = deriveE6SiteMapKinds(repairE6SiteMapColocation(managed, context, { carriedEntities: {} }).artifact, context).workspaces[0].kind;
  assert.equal(after, 'entityManagement');
});
