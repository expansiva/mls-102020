/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageSplitPlan.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSplitPlan, organismNameOf, type SplitPlanSection } from './cfePageSplitPlan.js';

// The real l4 of 102045/projectDetailWorkspace — the page that actually blew the output cap.
const SECTIONS: SplitPlanSection[] = [
  { sectionId: 'projectHeader', organisms: [{ role: 'primarySurface', dataSource: 'getProjectDetail' }] },
  { sectionId: 'taskTimeline', organisms: [{ role: 'primarySurface', dataSource: 'listWorkTasks' }, { role: 'filterControl', attachTo: 'listWorkTasks' }] },
  { sectionId: 'changeOrdersSection', organisms: [{ dataSource: 'listChangeOrders' }, { attachTo: 'listChangeOrders' }, { dataSource: 'getChangeOrderDetail' }] },
  { sectionId: 'costTracking', organisms: [{ dataSource: 'listTimeLogs' }, { attachTo: 'listTimeLogs' }, { dataSource: 'listMaterialUsages' }] },
  { sectionId: 'materialUsageSection', organisms: [{ dataSource: 'listMaterialUsages' }, { attachTo: 'listMaterialUsages' }] },
  { sectionId: 'delayRiskInsights', organisms: [{ dataSource: 'listDelayRiskSuggestions' }, { attachTo: 'listDelayRiskSuggestions' }, { action: 'triggerDelayRiskSuggestions' }] },
];
const BINDINGS = ['getProjectDetail', 'listWorkTasks', 'listChangeOrders', 'getChangeOrderDetail',
  'listTimeLogs', 'listMaterialUsages', 'triggerDelayRiskSuggestions', 'listDelayRiskSuggestions'];

test('one l4 section becomes one organism, in order', () => {
  const plan = buildSplitPlan('projectDetailWorkspace', 'page11', SECTIONS, BINDINGS, 'MAX_TOKENS')!;
  assert.deepEqual(plan.organisms.map(item => [item.n, item.organism]), [
    [1, 'projectHeader'], [2, 'taskTimeline'], [3, 'changeOrdersSection'],
    [4, 'costTracking'], [5, 'materialUsageSection'], [6, 'delayRiskInsights'],
  ]);
});

test('a binding is deduped inside its organism but NOT across organisms', () => {
  const plan = buildSplitPlan('pd', 'page11', SECTIONS, BINDINGS, 'x')!;
  // dataSource + attachTo of the same section point at one binding: listed once.
  assert.deepEqual(plan.organisms[1].bindings, ['listWorkTasks']);
  // Two sections legitimately present the same data — both render it. Simple rule, no exceptions.
  assert.ok(plan.organisms[3].bindings.includes('listMaterialUsages'));
  assert.ok(plan.organisms[4].bindings.includes('listMaterialUsages'));
});

test('an action-only section is an organism too', () => {
  const plan = buildSplitPlan('pd', 'page11', SECTIONS, BINDINGS, 'x')!;
  assert.deepEqual(plan.organisms[5].bindings, ['listDelayRiskSuggestions', 'triggerDelayRiskSuggestions']);
});

test('a binding no section claims still gets rendered, in an `other` organism', () => {
  const plan = buildSplitPlan('pd', 'page11', SECTIONS.slice(0, 2), BINDINGS, 'x')!;
  const last = plan.organisms[plan.organisms.length - 1];
  assert.equal(last.organism, 'other');
  // Dropping it silently would lose part of the page.
  assert.ok(last.bindings.includes('listChangeOrders'));
});

test('a section referencing something outside this page contributes nothing', () => {
  const plan = buildSplitPlan('pd', 'page11', [
    ...SECTIONS.slice(0, 2),
    { sectionId: 'foreign', organisms: [{ dataSource: 'somethingFromAnotherWorkspace' }] },
  ], ['getProjectDetail', 'listWorkTasks'], 'x')!;
  assert.deepEqual(plan.organisms.map(item => item.organism), ['projectHeader', 'taskTimeline']);
});

test('refuses to split when there is nothing to split into', () => {
  // One organism = the same big file plus a wrapper. Report instead of pretending.
  assert.equal(buildSplitPlan('pd', 'page11', SECTIONS.slice(0, 1), ['getProjectDetail'], 'x'), null);
  assert.equal(buildSplitPlan('pd', 'page11', [], BINDINGS, 'x'), null);
});

test('organismNameOf produces a usable identifier fragment', () => {
  assert.equal(organismNameOf('sec-delay-risk-insights'), 'delayRiskInsights');
  assert.equal(organismNameOf('delayRiskInsights'), 'delayRiskInsights');
  assert.equal(organismNameOf('sec_cost_kpis'), 'costKpis');
  assert.equal(organismNameOf('---'), 'section');
});
