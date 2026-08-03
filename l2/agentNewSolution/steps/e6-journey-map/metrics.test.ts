/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e6-journey-map/metrics.test.ts" enhancement="_blank"/>

// T0 (improveJourneys): the baseline is only a ruler if a test reproduces it. Two layers here:
// (1) synthetic unit tests pin each metric RULE (a fixture edit can never silently redefine a metric);
// (2) the three frozen fixtures must measure exactly what baseline-metrics.json records.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  measureNsJourneyMetrics,
  NsJourneyMetrics,
  NsJourneyMetricsInput,
  NsMetricJourney,
} from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/metrics.js';
import { NsE6Landing, NsE6Workspace } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE_FIXTURES = ['buildFlowFsm', 'cafeFlow', 'petShop'];

const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
const readDir = (path: string): Record<string, unknown>[] => readdirSync(path).sort().map(file => readJson(resolve(path, file)));

// The e2 artifact lives in its OWNING step folder (steps/e2-journeys/fixture/baseline/<name>) and is a
// declared input of e6 (flow.json e6.input) — the same crossing production does, never a code import.
function loadBaselineFixture(name: string): NsJourneyMetricsInput {
  const e6 = resolve(here, 'fixture/baseline', name);
  const siteMap = readJson(resolve(e6, 'siteMap.json'));
  const siteMapWorkspaces = (siteMap.workspaces as NsE6Workspace[]).map(workspace => ({
    workspaceId: workspace.workspaceId, actors: workspace.actors, operationIds: workspace.operationIds,
  }));
  const e2 = readJson(resolve(here, '../e2-journeys/fixture/baseline', name, 'e2-journeys.json'));
  return {
    workspaces: readDir(resolve(e6, 'workspaces')) as unknown as NsE6Workspace[],
    siteMapWorkspaces,
    landings: siteMap.landings as NsE6Landing[],
    journeys: readDir(resolve(e6, 'journeys')) as unknown as NsMetricJourney[],
    e2Journeys: (e2.journeys as { journeyId: string }[]),
  };
}

const emptyInput: NsJourneyMetricsInput = { workspaces: [], siteMapWorkspaces: [], landings: [], journeys: [], e2Journeys: [] };

function workspace(partial: Partial<NsE6Workspace>): NsE6Workspace {
  return {
    workspaceId: 'ws', title: 'Workspace', actors: ['actor'], kind: 'operation', entity: 'Thing',
    bffCalls: [], sections: [], operationIds: [], purpose: 'purpose', ...partial,
  } as NsE6Workspace;
}

void test('M1 counts a required id per missing provider and clears the ones that resolve locally', () => {
  const metrics = measureNsJourneyMetrics({
    ...emptyInput,
    workspaces: [workspace({
      bffCalls: [
        { bffId: 'listThings', kind: 'query', uses: [], output: { kind: 'list', fields: [{ name: 'thingId', from: 'listThings.thingId' }] } },
        { bffId: 'cmdA', kind: 'command', uses: [], input: [{ name: 'thingId', required: true, source: 'selection', sourceRef: 'listThings' }] },
        { bffId: 'cmdB', kind: 'command', uses: [], input: [{ name: 'otherId', required: true, source: 'pageInput' }] },
        { bffId: 'cmdC', kind: 'command', uses: [], input: [{ name: 'otherId', required: true, source: 'selection', sourceRef: 'nowhere' }] },
        { bffId: 'cmdD', kind: 'command', uses: [], input: [{ name: 'otherId', required: true }] },
        { bffId: 'cmdE', kind: 'command', uses: [], input: [{ name: 'title', required: true, source: 'userDecision' }] },
      ],
    })],
  });
  assert.equal(metrics.sourceAware, true);
  assert.deepEqual(metrics.m1RequiredIdsWithoutProvider.bySource, { pageInput: 1, selectionUnresolved: 1, sourceMissing: 1, derivedUnresolved: 0 });
  assert.equal(metrics.m1RequiredIdsWithoutProvider.total, 3); // the `selection` over a local query and the non-id input do not count
  // Structural mode ignores `source` entirely: only cmdA's thingId has a local query providing it.
  assert.equal(metrics.m1RequiredIdsWithoutProvider.structural.unprovidedRequiredIds, 3);
});

void test('M1 structural mode never lets a call provide its own input', () => {
  const metrics = measureNsJourneyMetrics({
    ...emptyInput,
    workspaces: [workspace({
      bffCalls: [{
        bffId: 'getDashboard', kind: 'query', uses: [],
        input: [{ name: 'shiftId', required: true }],
        output: { kind: 'object', fields: [{ name: 'shiftId', from: 'getDashboard.shiftId' }] },
      }],
    })],
  });
  assert.equal(metrics.m1RequiredIdsWithoutProvider.structural.unprovidedRequiredIds, 1);
});

void test('M2 counts only workflow workspaces and only the ones with no query at all', () => {
  const metrics = measureNsJourneyMetrics({
    ...emptyInput,
    workspaces: [
      workspace({ workspaceId: 'a', kind: 'workflow', bffCalls: [{ bffId: 'cmd', kind: 'command', uses: [] }] }),
      workspace({ workspaceId: 'b', kind: 'workflow', bffCalls: [{ bffId: 'list', kind: 'query', uses: [] }] }),
      workspace({ workspaceId: 'c', kind: 'operation', bffCalls: [{ bffId: 'cmd', kind: 'command', uses: [] }] }),
    ],
  });
  assert.deepEqual(metrics.m2WorkflowWorkspacesWithoutQuery, { count: 1, total: 2 });
});

void test('M3 flags an anchor that excludes the actor or hosts fewer of the journey ops than another page', () => {
  const siteMapWorkspaces = [
    { workspaceId: 'dashboard', actors: ['pm'], operationIds: ['viewDashboard'] },
    { workspaceId: 'orders', actors: ['pm'], operationIds: ['createOrder', 'updateOrder'] },
    { workspaceId: 'field', actors: ['worker'], operationIds: ['logHours'] },
  ];
  const journeys: NsMetricJourney[] = [
    { journeyId: 'good', actorId: 'pm', steps: ['a', 'b'], operationIds: ['createOrder', 'updateOrder'], workspaceId: 'orders' },
    { journeyId: 'weakAnchor', actorId: 'pm', steps: ['a', 'b'], operationIds: ['createOrder', 'updateOrder'], workspaceId: 'dashboard' },
    { journeyId: 'foreignActor', actorId: 'worker', steps: ['a'], operationIds: ['logHours'], workspaceId: 'orders' },
    { journeyId: 'unknownAnchor', actorId: 'pm', steps: ['a'], operationIds: [], workspaceId: 'ghost' },
  ];
  const metrics = measureNsJourneyMetrics({ ...emptyInput, siteMapWorkspaces, journeys });
  assert.deepEqual(metrics.m3JourneysWithWeakAnchor, { count: 3, total: 4 });
});

void test('M4 flags a journey carrying more than two operations per step', () => {
  const journeys: NsMetricJourney[] = [
    { journeyId: 'tight', actorId: 'pm', steps: ['a', 'b'], operationIds: ['o1', 'o2', 'o3', 'o4'], workspaceId: 'w' },
    { journeyId: 'bag', actorId: 'pm', steps: ['a', 'b'], operationIds: ['o1', 'o2', 'o3', 'o4', 'o5'], workspaceId: 'w' },
  ];
  assert.deepEqual(measureNsJourneyMetrics({ ...emptyInput, journeys }).m4JourneysWithOperationBag, { count: 1, total: 2 });
});

void test('M5 flags a landing that needs a pageInput or an unsourced id, and passes a self-sufficient one', () => {
  const workspaces = [
    workspace({ workspaceId: 'selfSufficient', bffCalls: [
      { bffId: 'listMine', kind: 'query', uses: [], input: [{ name: 'actorId', required: true, source: 'actorSession' }], output: { kind: 'list', fields: [{ name: 'taskId', from: 'listMine.taskId' }] } },
      { bffId: 'cmdDone', kind: 'command', uses: [], input: [{ name: 'taskId', required: true, source: 'selection', sourceRef: 'listMine' }] },
    ] }),
    workspace({ workspaceId: 'needsPageInput', bffCalls: [
      { bffId: 'viewCost', kind: 'query', uses: [], input: [{ name: 'projectId', required: true, source: 'pageInput' }] },
    ] }),
    workspace({ workspaceId: 'unsourcedId', bffCalls: [
      { bffId: 'viewCost', kind: 'query', uses: [], input: [{ name: 'projectId', required: true }] },
    ] }),
  ];
  const landings: NsE6Landing[] = [
    { actorId: 'a', workspaceId: 'selfSufficient' }, { actorId: 'b', workspaceId: 'needsPageInput' }, { actorId: 'c', workspaceId: 'unsourcedId' },
  ];
  const metrics = measureNsJourneyMetrics({ ...emptyInput, workspaces, landings });
  assert.deepEqual(metrics.m5LandingsNotSelfSufficient, { mode: 'source', count: 2, total: 3 });
});

void test('M6 counts a free-text trigger and a structured prerequisite, never an empty one', () => {
  const metrics = measureNsJourneyMetrics({
    ...emptyInput,
    e2Journeys: [
      { journeyId: 'a', trigger: 'the client asks for a quote' },
      { journeyId: 'b', prerequisite: { kind: 'journey', journeyId: 'a' } },
      { journeyId: 'c', trigger: '   ' },
      { journeyId: 'd' },
    ],
  });
  assert.deepEqual(metrics.m6JourneysWithPrerequisite, { count: 2, total: 4 });
});

// --- the frozen baseline -----------------------------------------------------

for (const name of BASELINE_FIXTURES) {
  void test(`baseline fixture ${name} measures exactly what baseline-metrics.json records`, () => {
    const recorded = readJson(resolve(here, 'fixture/baseline', name, 'baseline-metrics.json'));
    const measured = measureNsJourneyMetrics(loadBaselineFixture(name));
    assert.deepEqual(measured, recorded.metrics as unknown as NsJourneyMetrics);
  });
}

void test('petShop is the clean control: every defect metric is zero', () => {
  const metrics = measureNsJourneyMetrics(loadBaselineFixture('petShop'));
  assert.equal(metrics.m1RequiredIdsWithoutProvider.total, 0);
  assert.equal(metrics.m2WorkflowWorkspacesWithoutQuery.count, 0);
  assert.equal(metrics.m3JourneysWithWeakAnchor.count, 0);
  assert.equal(metrics.m4JourneysWithOperationBag.count, 0);
  assert.equal(metrics.m5LandingsNotSelfSufficient.count, 0);
});
