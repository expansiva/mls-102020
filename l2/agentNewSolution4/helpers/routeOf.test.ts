import assert from 'node:assert/strict';
import test from 'node:test';

import { routeOf } from '/_102020_/l2/agentNewSolution4/helpers/routeOf.js';

// The run 41 projection, kept inline: routeOf is a helper and outlived the E8 fixture that recorded it.
const fixture = {
  moduleName: 'buildFlowFsm41',
  expected: {
    unique: '/buildFlowFsm41/projects/:projectId/changeOrders/decide/:changeOrderId',
    ambiguous: '/buildFlowFsm41/projects/:projectId/changeOrders/decide',
  },
} as const;
const selectedProject = { contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one' as const, required: true, idFieldRef: 'projectId' };
const selectedChangeOrder = { contextId: 'selectedChangeOrder', businessObject: 'ChangeOrder', cardinality: 'one' as const, required: true, idFieldRef: 'changeOrderId' };
const selectedRisk = { contextId: 'selectedRisk', businessObject: 'Risk', cardinality: 'one' as const, required: true, idFieldRef: 'riskId' };
const hub: any = { workspaceId: 'projectWorkspace', kind: 'hub', anchorEntity: 'Project', pageContext: [selectedProject], scenarios: [], commandEntityRefs: [] };
const place: any = { workspaceId: 'changeOrderWorkspace', kind: 'place', anchorEntity: 'ChangeOrder', pageContext: [], scenarios: [], commandEntityRefs: [] };
const edges = [{ from: hub.workspaceId, to: place.workspaceId, carries: [selectedProject.contextId] }];

test('routeOf emits a nested decide deep link for one primary target', () => {
  const scenario: any = { scenarioId: 'reviewDecide', kind: 'review', title: 'Decide', useCaseIds: ['decideChangeOrder'], selectionContexts: [selectedChangeOrder] };
  const result = routeOf(fixture.moduleName, place, scenario, { workspaces: [hub, place], edges, useCases: [{ useCaseId: 'decideChangeOrder', entityRefs: ['ChangeOrder'] }] });
  assert.equal(result.routePattern, fixture.expected.unique);
  assert.deepEqual(result.pathContextIds, ['selectedChangeOrder', 'selectedProject']);
  assert.deepEqual(result.systemDecisions, []);
});

test('routeOf omits item id and records a decision for two primary targets', () => {
  const scenario: any = { scenarioId: 'reviewDecide', kind: 'review', title: 'Decide', useCaseIds: ['decideChangeOrder', 'decideRisk'], selectionContexts: [selectedChangeOrder, selectedRisk] };
  const result = routeOf(fixture.moduleName, place, scenario, { workspaces: [hub, place], edges, useCases: [
    { useCaseId: 'decideChangeOrder', entityRefs: ['ChangeOrder'] }, { useCaseId: 'decideRisk', entityRefs: ['Risk'] },
  ] });
  assert.equal(result.routePattern, fixture.expected.ambiguous);
  assert.equal(result.routePattern.includes(':changeOrderId'), false);
  assert.equal(result.systemDecisions.length, 1);
  assert.equal(result.systemDecisions[0].chosen, 'openWithoutDirectRecordLink');
});
