/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  deriveE6Journeys,
  NsE6Journey,
  NsE6JourneyOperation,
  NsE6JourneyWorkspace,
  readE6JourneySources,
  resolveNsCarryToEntity,
  validateE6Journeys,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.js';
import { measureNsJourneyMetrics } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/metrics.js';
import { NsE6Landing, NsE6Workspace } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

const sources = readE6JourneySources({
  journeys: [
    { journeyId: 'explorar', actorId: 'cliente', title: 'Explorar destaques', goal: 'Descobrir destaques', outcome: 'Cliente vê destaques',
      steps: [{ title: 'Acessar home', featureRefs: ['featured'] }, { title: 'Ver destaque', featureRefs: ['featured', 'detail'] }] },
    { journeyId: 'reservar', actorId: 'cliente', title: 'Reservar', goal: 'Reservar produto', outcome: 'Reserva criada',
      steps: [{ title: 'Escolher', featureRefs: ['detail'] }, { title: 'Reservar', featureRefs: ['reserve'] }] },
  ],
});

const operations = [
  { operationId: 'browseHighlights', featureRefs: ['featured'] },
  { operationId: 'viewProductDetail', featureRefs: ['detail'] },
  { operationId: 'createReservation', featureRefs: ['reserve'] },
  { operationId: 'internalAudit', featureRefs: ['audit'] }, // referenced by no journey
];

const workspaces = [
  { workspaceId: 'home', actors: ['cliente'], operationIds: ['browseHighlights'] },
  { workspaceId: 'catalog', actors: ['cliente'], operationIds: ['viewProductDetail', 'createReservation'] },
];

void test('deriveE6Journeys links each journey to its operations and a hosting workspace', () => {
  const journeys = deriveE6Journeys(sources, operations, workspaces);
  const explorar = journeys.find(j => j.journeyId === 'explorar')!;
  // No single operation covers "featured + detail", so only the step that IS covered contributes.
  assert.deepEqual(explorar.operationIds, ['browseHighlights']);
  assert.deepEqual(explorar.steps, ['Acessar home', 'Ver destaque']); // narrative preserved
  assert.equal(explorar.workspaceId, 'home');
  const reservar = journeys.find(j => j.journeyId === 'reservar')!;
  assert.deepEqual(reservar.operationIds.sort(), ['createReservation', 'viewProductDetail']);
  assert.equal(reservar.workspaceId, 'catalog'); // the workspace hosting both
});

void test('validateE6Journeys passes valid links and warns on an unreferenced operation', () => {
  const journeys = deriveE6Journeys(sources, operations, workspaces);
  const { issues } = validateE6Journeys(journeys, {
    operationIds: operations.map(o => o.operationId),
    workspaceIds: workspaces.map(w => w.workspaceId),
  });
  assert.ok(!issues.some(i => i.severity === 'error'));
  assert.ok(issues.some(i => i.code === 'journey.operation.unreferenced' && i.path === 'internalAudit'));
});

void test('validateE6Journeys blocks an unknown operation and an unknown workspace', () => {
  const journeys = deriveE6Journeys(sources, operations, workspaces);
  journeys[0].operationIds.push('ghostOp');
  journeys[0].workspaceId = 'ghostWorkspace';
  const { issues } = validateE6Journeys(journeys, {
    operationIds: operations.map(o => o.operationId),
    workspaceIds: workspaces.map(w => w.workspaceId),
  });
  assert.ok(issues.some(i => i.code === 'journey.operation.unknown'));
  assert.ok(issues.some(i => i.code === 'journey.workspace.unknown'));
});

// --- T1: narrowing + anchor ---------------------------------------------------

// One coarse feature ("ops") carries operations of two entities and two actors — the shape that turned
// the 102045 journeys into a bag of everything anchored on the first workspace declared.
const wideOperations: NsE6JourneyOperation[] = [
  { operationId: 'createOrder', featureRefs: ['ops'], actorId: 'clerk', entity: 'Order', kind: 'create' },
  { operationId: 'updateOrder', featureRefs: ['ops'], actorId: 'clerk', entity: 'Order', kind: 'update' },
  { operationId: 'queryOrders', featureRefs: ['ops'], actorId: 'clerk', entity: 'Order', kind: 'query' },
  { operationId: 'createClient', featureRefs: ['ops'], actorId: 'clerk', entity: 'Client', kind: 'create' },
  { operationId: 'queryClients', featureRefs: ['ops'], actorId: 'clerk', entity: 'Client', kind: 'query' },
  { operationId: 'cookOrder', featureRefs: ['ops'], actorId: 'cook', entity: 'Order', kind: 'update' },
  { operationId: 'priceOrder', featureRefs: ['ops', 'pricing'], actorId: 'clerk', entity: 'Order', kind: 'update' },
];
const wideWorkspaces: NsE6JourneyWorkspace[] = [
  { workspaceId: 'dashboard', actors: ['clerk'], operationIds: [] },
  { workspaceId: 'clients', actors: ['clerk'], operationIds: ['createClient', 'queryClients'] },
  { workspaceId: 'orders', actors: ['clerk'], operationIds: ['createOrder', 'updateOrder', 'queryOrders', 'priceOrder'] },
  { workspaceId: 'kitchen', actors: ['cook'], operationIds: ['cookOrder'] },
];
const wideSources = readE6JourneySources({
  journeys: [
    { journeyId: 'takeOrder', actorId: 'clerk', title: 'Take an order', goal: 'g', outcome: 'o',
      steps: [{ title: 'Open orders', featureRefs: ['ops'] }, { title: 'Price it', featureRefs: ['ops', 'pricing'] }] },
    { journeyId: 'cook', actorId: 'cook', title: 'Cook', goal: 'g', outcome: 'o',
      steps: [{ title: 'Cook it', featureRefs: ['ops'] }] },
  ],
});

void test('the journey keeps its primary entity and its own actor, not everything sharing a feature', () => {
  const [takeOrder, cook] = deriveE6Journeys(wideSources, wideOperations, wideWorkspaces);
  // Client operations share the feature but not the entity the journey writes to; cookOrder is another actor's.
  assert.deepEqual(takeOrder.operationIds.sort(), ['createOrder', 'priceOrder', 'queryOrders', 'updateOrder']);
  assert.deepEqual(cook.operationIds, ['cookOrder']);
});

void test('the human-approved prerequisite reaches the permanent journey defs untouched', () => {
  const sources = readE6JourneySources({
    journeys: [
      { journeyId: 'takeOrder', actorId: 'clerk', title: 't', goal: 'g', outcome: 'o', steps: [{ title: 's', featureRefs: ['ops'] }],
        prerequisite: { kind: 'journey', journeyId: 'openShift', carries: ['Shift'], description: 'ignored downstream' } },
      { journeyId: 'openShift', actorId: 'clerk', title: 't', goal: 'g', outcome: 'o', steps: [{ title: 's', featureRefs: ['ops'] }] },
    ],
  });
  const [takeOrder, openShift] = deriveE6Journeys(sources, wideOperations, wideWorkspaces);
  assert.deepEqual(takeOrder.prerequisite, { kind: 'journey', journeyId: 'openShift', carries: ['Shift'] });
  assert.equal(openShift.prerequisite, undefined); // an entry journey carries no field at all
});

void test('the anchor hosts the journey operations and always includes the actor', () => {
  const [takeOrder, cook] = deriveE6Journeys(wideSources, wideOperations, wideWorkspaces);
  assert.equal(takeOrder.workspaceId, 'orders');  // never `dashboard`, the first workspace declared
  assert.equal(cook.workspaceId, 'kitchen');      // never a workspace the actor is absent from
});

void test('a tie on hosted operations breaks by where the journey writes, then by the actor landing', () => {
  const operationsTied: NsE6JourneyOperation[] = [
    { operationId: 'adjustStock', featureRefs: ['ops'], actorId: 'manager', entity: 'StockAdjustment', kind: 'create' },
    { operationId: 'viewDashboard', featureRefs: ['ops'], actorId: 'manager', entity: 'Dashboard', kind: 'query' },
  ];
  const workspacesTied: NsE6JourneyWorkspace[] = [
    { workspaceId: 'dashboard', actors: ['manager'], operationIds: ['viewDashboard'] },
    { workspaceId: 'stock', actors: ['manager'], operationIds: ['adjustStock'] },
  ];
  const tiedSources = readE6JourneySources({
    journeys: [{ journeyId: 'manageStock', actorId: 'manager', title: 't', goal: 'g', outcome: 'o', steps: [{ title: 'Adjust', featureRefs: ['ops'] }] }],
  });
  const landings: NsE6Landing[] = [{ actorId: 'manager', workspaceId: 'dashboard' }];
  // Both pages host exactly one operation (the write entity owns no page of its own, as StockAdjustment
  // does not in the cafeFlow run): the page where the journey WRITES beats the actor's landing.
  assert.equal(deriveE6Journeys(tiedSources, operationsTied, workspacesTied, landings)[0].workspaceId, 'stock');
  // With no write at all, the landing is the tie-break.
  const readOnly = operationsTied.map(operation => ({ ...operation, kind: 'query' }));
  assert.equal(deriveE6Journeys(tiedSources, readOnly, workspacesTied, landings)[0].workspaceId, 'dashboard');
});

void test('validateE6Journeys errors on an anchor that excludes the actor and warns on a foreign operation', () => {
  const journeys: NsE6Journey[] = [{
    journeyId: 'cook', actorId: 'cook', title: 't', goal: 'g', steps: ['s'], outcome: 'o',
    operationIds: ['cookOrder', 'createOrder'], workspaceId: 'orders',
  }];
  const { issues } = validateE6Journeys(journeys, {
    operationIds: wideOperations.map(o => o.operationId),
    workspaceIds: wideWorkspaces.map(w => w.workspaceId),
    workspaceActors: Object.fromEntries(wideWorkspaces.map(w => [w.workspaceId, w.actors])),
    operationActor: Object.fromEntries(wideOperations.map(o => [o.operationId, o.actorId!])),
  });
  const mismatch = issues.find(i => i.code === 'journey.anchor.actorMismatch');
  assert.equal(mismatch?.severity, 'error');
  const foreign = issues.find(i => i.code === 'journey.operation.foreignActor');
  assert.equal(foreign?.severity, 'warning');
  assert.ok(foreign?.message.includes('createOrder'));
});

// --- T1 acceptance: re-derive over the frozen T0 fixtures and measure ---------

const here = dirname(fileURLToPath(import.meta.url));
const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
const readDir = (path: string) => readdirSync(path).sort().map(file => readJson(resolve(path, file)));

interface ClassifiedOperation { operationId: string; featureRefs?: string[]; actorId?: string; entity?: string; kind?: string }

function rederive(name: string): { journeys: NsE6Journey[]; siteMap: Record<string, unknown>; e2: Record<string, unknown> } {
  const fixture = resolve(here, 'fixture/baseline', name);
  const siteMap = readJson(resolve(fixture, 'siteMap.json'));
  const classification = readJson(resolve(fixture, 'e5-classification.json'));
  const e2 = readJson(resolve(here, '../e2-journeys/fixture/baseline', name, 'e2-journeys.json'));
  const journeys = deriveE6Journeys(
    readE6JourneySources(e2),
    (classification.operations as ClassifiedOperation[]).map(operation => ({
      operationId: operation.operationId, featureRefs: operation.featureRefs,
      actorId: operation.actorId, entity: operation.entity, kind: operation.kind,
    })),
    (siteMap.workspaces as NsE6Workspace[]).map(w => ({ workspaceId: w.workspaceId, actors: w.actors, operationIds: w.operationIds })),
    siteMap.landings as NsE6Landing[],
  );
  return { journeys, siteMap, e2 };
}

/**
 * The acceptance criterion of improveJourneys T1: re-deriving the journeys from the SAME inputs of a
 * frozen run must zero M3 (weak anchor) and M4 (bag of operations) — measured by the T0 ruler, which is
 * defined over the artifact, not over this derivation.
 */
for (const name of ['buildFlowFsm', 'cafeFlow', 'petShop']) {
  void test(`re-deriving the ${name} journeys zeroes M3/M4 and leaves the workspace metrics untouched`, () => {
    const { journeys, siteMap, e2 } = rederive(name);
    const fixture = resolve(here, 'fixture/baseline', name);
    const measured = measureNsJourneyMetrics({
      workspaces: readDir(resolve(fixture, 'workspaces')) as unknown as NsE6Workspace[],
      siteMapWorkspaces: (siteMap.workspaces as NsE6Workspace[]).map(w => ({ workspaceId: w.workspaceId, actors: w.actors, operationIds: w.operationIds })),
      landings: siteMap.landings as NsE6Landing[],
      journeys,
      e2Journeys: e2.journeys as { journeyId: string }[],
    });
    const baseline = readJson(resolve(fixture, 'baseline-metrics.json')).metrics as Record<string, unknown>;
    assert.equal(measured.m3JourneysWithWeakAnchor.count, 0, 'M3 must be zero after re-derivation');
    assert.equal(measured.m4JourneysWithOperationBag.count, 0, 'M4 must be zero after re-derivation');
    // The derivation owns journeys only — the workspace-level metrics must be exactly the baseline.
    assert.deepEqual(measured.m1RequiredIdsWithoutProvider, baseline.m1RequiredIdsWithoutProvider);
    assert.deepEqual(measured.m2WorkflowWorkspacesWithoutQuery, baseline.m2WorkflowWorkspacesWithoutQuery);
    assert.deepEqual(measured.m5LandingsNotSelfSufficient, baseline.m5LandingsNotSelfSufficient);
  });
}

void test('the re-derived 102045 journeys anchor where their operations live', () => {
  const { journeys } = rederive('buildFlowFsm');
  const anchorOf = (journeyId: string) => journeys.find(journey => journey.journeyId === journeyId)!.workspaceId;
  // The symptom that opened the investigation: manageChangeOrder used to anchor on dashboardWorkspace
  // (which hosts none of its operations) carrying 15 operations for 3 steps.
  const changeOrder = journeys.find(journey => journey.journeyId === 'manageChangeOrder')!;
  assert.equal(changeOrder.workspaceId, 'changeOrderWorkspace');
  assert.ok(changeOrder.operationIds.every(id => id.toLowerCase().includes('changeorder')));
  // The fieldWorker and client journeys used to anchor on project-manager-only pages.
  assert.equal(anchorOf('viewAssignedTasks'), 'myTasksWorkspace');
  assert.equal(anchorOf('logDailyProgress'), 'fieldLoggingWorkspace');
  assert.equal(anchorOf('viewProjectStatus'), 'clientStatusWorkspace');
  assert.equal(anchorOf('reviewBillingSummary'), 'clientBillingWorkspace');
});

void test('no cafeFlow journey loses the anchor the baseline run got right', () => {
  const { journeys } = rederive('cafeFlow');
  const anchorOf = (journeyId: string) => journeys.find(journey => journey.journeyId === journeyId)!.workspaceId;
  // The 2 the baseline already had right must hold...
  assert.equal(anchorOf('followOrderUntilServe'), 'posWorkspace');
  assert.equal(anchorOf('maintainMenu'), 'menuManagement');
  // ...including manageInventory, whose ops tie 1-1 between the manager's landing (dashboard) and the
  // page that hosts the write. The primary entity (StockAdjustment) owns no page: the write breaks it.
  assert.equal(anchorOf('manageInventory'), 'stockManagement');
  // ...and the 3 it had wrong must move to a page of the actor that hosts the journey's operations.
  assert.equal(anchorOf('runDailyShift'), 'shiftWorkspace');
  assert.equal(anchorOf('processKitchenQueue'), 'kitchenWorkspace');
  assert.equal(anchorOf('useDashboardAndAi'), 'dashboardWorkspace');
});

void test('the re-derived journeys pass their own gate on every baseline fixture', () => {
  for (const name of ['buildFlowFsm', 'cafeFlow', 'petShop']) {
    const { journeys, siteMap } = rederive(name);
    const classification = readJson(resolve(here, 'fixture/baseline', name, 'e5-classification.json'));
    const operationsOf = classification.operations as ClassifiedOperation[];
    const { issues } = validateE6Journeys(journeys, {
      operationIds: operationsOf.map(operation => operation.operationId),
      workspaceIds: (siteMap.workspaces as NsE6Workspace[]).map(w => w.workspaceId),
      workspaceActors: Object.fromEntries((siteMap.workspaces as NsE6Workspace[]).map(w => [w.workspaceId, w.actors])),
      operationActor: Object.fromEntries(operationsOf.map(operation => [operation.operationId, operation.actorId || ''])),
    });
    const errors = issues.filter(issue => issue.severity === 'error');
    assert.deepEqual(errors.map(issue => `${issue.code}:${issue.path}`), [], `${name} must derive gate-clean journeys`);
  }
});

void test('narrowing surfaces the operations no journey is about as warnings, not silence', () => {
  const { journeys, siteMap } = rederive('buildFlowFsm');
  const classification = readJson(resolve(here, 'fixture/baseline/buildFlowFsm/e5-classification.json'));
  const operationsOf = classification.operations as ClassifiedOperation[];
  const { issues } = validateE6Journeys(journeys, {
    operationIds: operationsOf.map(operation => operation.operationId),
    workspaceIds: (siteMap.workspaces as NsE6Workspace[]).map(w => w.workspaceId),
  });
  const unreferenced = issues.filter(issue => issue.code === 'journey.operation.unreferenced');
  assert.ok(unreferenced.every(issue => issue.severity === 'warning'));
  // The 102045 e2 has no journey about clients, yet the run built a clientManagementWorkspace. The old
  // union hid that (every operation was swept into some journey); the narrowed set says it out loud.
  assert.ok(unreferenced.some(issue => issue.path === 'createClient'));
});

// The phrases below are VERBATIM from the 102046 run — the first time real carries existed.
void test('a carry is a business phrase: it resolves when some run of its words names an entity', () => {
  const entities = ['Project', 'WorkTask', 'TimeLog', 'MaterialUsage', 'StatusReport', 'BillingSummary', 'ChangeOrder'];
  const resolve = (carry: string) => resolveNsCarryToEntity(carry, entities);
  assert.equal(resolve('the project'), 'Project');
  assert.equal(resolve('assigned work tasks'), 'WorkTask');
  assert.equal(resolve('updated work tasks'), 'WorkTask');
  assert.equal(resolve('time logs'), 'TimeLog');
  assert.equal(resolve('materials usage'), 'MaterialUsage');
  assert.equal(resolve('professional status report'), 'StatusReport');
  assert.equal(resolve('billing summary'), 'BillingSummary');
  assert.equal(resolve('approved change orders'), 'ChangeOrder');
  // Not everything a journey carries is a record — and a guess would be worse than "unresolved".
  assert.equal(resolve('current job-cost position'), '');
  assert.equal(resolve('tasks needing schedule attention'), '');
  // Another language than the entity ids does not resolve: the gate degrades to a warning, honestly.
  assert.equal(resolve('o projeto'), '');
});

void test('the longest run of words wins, so a compound entity beats its own suffix', () => {
  assert.equal(resolveNsCarryToEntity('assigned work tasks', ['Task', 'WorkTask']), 'WorkTask');
  assert.equal(resolveNsCarryToEntity('the task', ['Task', 'WorkTask']), 'Task');
});
