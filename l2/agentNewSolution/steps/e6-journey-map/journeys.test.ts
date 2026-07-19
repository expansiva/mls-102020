/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveE6Journeys,
  readE6JourneySources,
  validateE6Journeys,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/journeys.js';

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
  assert.deepEqual(explorar.operationIds.sort(), ['browseHighlights', 'viewProductDetail']);
  assert.equal(explorar.workspaceId, 'home'); // first workspace hosting one of its operations
  assert.deepEqual(explorar.steps, ['Acessar home', 'Ver destaque']); // narrative preserved
  const reservar = journeys.find(j => j.journeyId === 'reservar')!;
  assert.deepEqual(reservar.operationIds.sort(), ['createReservation', 'viewProductDetail']);
  assert.equal(reservar.workspaceId, 'catalog');
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
