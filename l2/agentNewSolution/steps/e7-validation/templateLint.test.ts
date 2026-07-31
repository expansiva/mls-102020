/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e7-validation/templateLint.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseNsCategoryCatalog } from '/_102020_/l2/agentNewSolution/helpers/nsCategoryCatalog.js';
import { NsE6Workspace } from '/_102020_/l2/agentNewSolution/steps/e6-journey-map/gate.js';
import {
  buildNsTemplateCoverage,
  lintNsTemplateReadiness,
  renderNsTemplateCoverage,
} from '/_102020_/l2/agentNewSolution/steps/e7-validation/templateLint.js';

const here = dirname(fileURLToPath(import.meta.url));
// The REAL catalog: these tests are the contract between the lint and the minimumRequired blocks.
const catalog = parseNsCategoryCatalog(readFileSync(resolve(here, '../../../../l4/collabux/templates/categoryList.json'), 'utf8'))!;

function workspace(overrides: Partial<NsE6Workspace> = {}): NsE6Workspace {
  return {
    workspaceId: 'queue', title: 'Queue', actors: ['worker'], kind: 'operation', entity: 'Task',
    purpose: 'Work the queue.', operationIds: ['listTasks'],
    bffCalls: [paginatedQuery()],
    sections: [{ sectionId: 'main', intent: 'work', organisms: [{ role: 'primarySurface', dataSource: 'taskList' }] }],
    presentation: { categoryRef: 'operationsQueue', confidence: 9 },
    ...overrides,
  };
}

function paginatedQuery() {
  return {
    bffId: 'taskList', kind: 'query' as const, uses: [{ operationId: 'listTasks' }],
    output: { kind: 'paginated' as const, fields: [
      { name: 'tasks', type: 'array' as const, from: 'listTasks.$items', item: { fields: [
        { name: 'taskId', from: 'listTasks.$items.taskId', type: 'string' as const },
        { name: 'hours', from: 'listTasks.$items.hours', type: 'number' as const },
      ] } },
      { name: 'total', from: 'listTasks.total', type: 'number' as const },
    ] },
  };
}

// The run12-style shape the acceptance criterion targets: a flat `list` where the category needs a
// paginated envelope.
function listQuery() {
  return {
    bffId: 'taskList', kind: 'query' as const, uses: [{ operationId: 'listTasks' }],
    output: { kind: 'list' as const, fields: [
      { name: 'taskId', from: 'listTasks.$items.taskId', type: 'string' as const },
      { name: 'hours', from: 'listTasks.$items.hours', type: 'number' as const },
    ] },
  };
}

test('T4: a contract that meets the category minimum is template-ready', () => {
  const ws = workspace();
  const outcome = lintNsTemplateReadiness([ws], catalog);
  assert.equal(outcome.results[0].action, 'ok');
  assert.equal(outcome.results[0].templateReady, true);
  assert.equal(ws.presentation!.templateReady, true);
});

test('T4 (acceptance): a list query classified as operationsQueue leaves e7 with a paginated envelope', () => {
  const ws = workspace({ bffCalls: [listQuery()] });
  const outcome = lintNsTemplateReadiness([ws], catalog);

  assert.equal(outcome.results[0].action, 'repaired');
  assert.deepEqual(outcome.changed, ['queue']);
  const output = ws.bffCalls[0].output!;
  assert.equal(output.kind, 'paginated');
  // Exactly 1 array field carrying the ORIGINAL columns — the e6 paginated shape rule.
  assert.equal(output.fields.length, 1);
  assert.equal(output.fields[0].type, 'array');
  assert.equal(output.fields[0].from, 'listTasks.$items');
  assert.deepEqual(output.fields[0].item!.fields.map(field => field.name), ['taskId', 'hours']);
  // No invented envelope scalar: `listTasks.total` may not exist in the operation's output.
  assert.equal(output.fields.some(field => field.name === 'total'), false);
  assert.equal(ws.presentation!.templateReady, true);
});

test('T4: a repair never touches the business — only the output envelope moves', () => {
  const ws = workspace({ bffCalls: [listQuery()] });
  const before = JSON.parse(JSON.stringify({ ...ws, bffCalls: ws.bffCalls.map(call => ({ ...call, output: undefined })) }));
  lintNsTemplateReadiness([ws], catalog);
  const after = JSON.parse(JSON.stringify({ ...ws, bffCalls: ws.bffCalls.map(call => ({ ...call, output: undefined })) }));
  // entity, operationIds, uses, inputs, sections, actors: all identical.
  assert.deepEqual({ ...after, presentation: undefined }, { ...before, presentation: undefined });
});

test('T4: missing business semantics downgrades to an alternate the contract satisfies', () => {
  // inventoryControl needs a numeric measure ON THE ITEM; this contract has none, but operationsQueue
  // (an alternate with confidence >= 6) only needs a paginated query with an id.
  const noMeasure = {
    bffId: 'taskList', kind: 'query' as const, uses: [{ operationId: 'listTasks' }],
    output: { kind: 'paginated' as const, fields: [
      { name: 'tasks', type: 'array' as const, from: 'listTasks.$items', item: { fields: [
        { name: 'taskId', from: 'listTasks.$items.taskId', type: 'string' as const },
        { name: 'label', from: 'listTasks.$items.label', type: 'string' as const },
      ] } },
      { name: 'total', from: 'listTasks.total', type: 'number' as const },
    ] },
  };
  const ws = workspace({
    bffCalls: [noMeasure],
    presentation: { categoryRef: 'inventoryControl', confidence: 7, alternates: [{ categoryRef: 'operationsQueue', confidence: 6, reason: 'is a queue' }] },
  });
  const outcome = lintNsTemplateReadiness([ws], catalog);

  assert.equal(outcome.results[0].action, 'downgraded');
  assert.equal(outcome.results[0].originalCategoryRef, 'inventoryControl');
  assert.equal(ws.presentation!.categoryRef, 'operationsQueue');
  assert.equal(ws.presentation!.templateReady, true);
  assert.match(ws.presentation!.classificationNote!, /downgraded from inventoryControl to operationsQueue/);
  assert.match(outcome.issues.find(issue => issue.code === 'template.category.downgraded')!.message, /numeric measure/);
});

test('T4: with no satisfiable alternate the workspace is marked not template-ready', () => {
  const ws = workspace({
    bffCalls: [{ bffId: 'detail', kind: 'query', uses: [{ operationId: 'getTask' }], output: { kind: 'object', fields: [{ name: 'taskId', from: 'getTask.taskId', type: 'string' }] } }],
    presentation: { categoryRef: 'inventoryControl', confidence: 7, alternates: [{ categoryRef: 'operationsQueue', confidence: 3, reason: 'weak' }] },
  });
  const outcome = lintNsTemplateReadiness([ws], catalog);
  assert.equal(outcome.results[0].action, 'unready');
  assert.equal(ws.presentation!.templateReady, false);
  assert.equal(ws.presentation!.categoryRef, 'inventoryControl', 'the best category is kept');
  assert.ok(outcome.issues.some(issue => issue.code === 'template.notReady'));
});

test('T4: a category with no minimumRequired is SKIPPED with a warning, never judged', () => {
  const ws = workspace({ presentation: { categoryRef: 'caseManagement', confidence: 8 } });
  const outcome = lintNsTemplateReadiness([ws], catalog);
  assert.equal(outcome.results[0].action, 'skipped');
  assert.equal(ws.presentation!.templateReady, undefined, 'no readiness claim without a contract to check');
  assert.ok(outcome.issues.some(issue => issue.code === 'template.category.noMinimum'));
});

test('T4: a downgrade never lands on an unverifiable category', () => {
  const noMeasure = {
    bffId: 'taskList', kind: 'query' as const, uses: [{ operationId: 'listTasks' }],
    output: { kind: 'paginated' as const, fields: [
      { name: 'tasks', type: 'array' as const, from: 'listTasks.$items', item: { fields: [{ name: 'taskId', from: 'listTasks.$items.taskId', type: 'string' as const }] } },
    ] },
  };
  // caseManagement has no minimumRequired: landing there would CLAIM readiness nobody can verify.
  const onlyUnverifiable = workspace({
    bffCalls: [noMeasure],
    presentation: { categoryRef: 'inventoryControl', confidence: 7, alternates: [{ categoryRef: 'caseManagement', confidence: 9, reason: 'looks like a case' }] },
  });
  const skipped = lintNsTemplateReadiness([onlyUnverifiable], catalog);
  assert.equal(skipped.results[0].action, 'unready', 'no verifiable landing place => not ready, not a blind downgrade');
  assert.equal(onlyUnverifiable.presentation!.categoryRef, 'inventoryControl');
  assert.equal(onlyUnverifiable.presentation!.templateReady, false);

  // With a verifiable alternate present, it wins even though its confidence is LOWER.
  const withVerifiable = workspace({
    bffCalls: [noMeasure],
    presentation: { categoryRef: 'inventoryControl', confidence: 7, alternates: [
      { categoryRef: 'caseManagement', confidence: 9, reason: 'looks like a case' },
      { categoryRef: 'operationsQueue', confidence: 6, reason: 'is a queue' },
    ] },
  });
  const downgraded = lintNsTemplateReadiness([withVerifiable], catalog);
  assert.equal(downgraded.results[0].action, 'downgraded');
  assert.equal(withVerifiable.presentation!.categoryRef, 'operationsQueue');
});

test('T4 (acceptance, billingWorkspace): a required id with no source is reported', () => {
  const ws = workspace({
    bffCalls: [
      paginatedQuery(),
      { bffId: 'createInvoice', kind: 'command', uses: [{ operationId: 'createInvoice' }], input: [
        { name: 'projectId', required: true, type: 'string' },                                  // the defect
        { name: 'billingSummaryId', required: true, type: 'string', source: 'derived', sourceRef: 'prepareSummary.billingSummaryId' },
        { name: 'notes', required: false, type: 'string' },
      ] },
    ],
  });
  const codes = lintNsTemplateReadiness([ws], catalog).issues.filter(issue => issue.code === 'template.input.idWithoutSource');
  assert.equal(codes.length, 1, codes.map(issue => issue.message).join('; '));
  assert.match(codes[0].message, /required id "projectId"/);
});

test('T4: an id declared userDecision is still a finding; a non-id typed input is not', () => {
  const ws = workspace({
    bffCalls: [paginatedQuery(), { bffId: 'cmd', kind: 'command', uses: [{ operationId: 'cmd' }], input: [
      { name: 'projectId', required: true, type: 'string', source: 'userDecision' },
      { name: 'title', required: true, type: 'string', source: 'userDecision' },
    ] }],
  });
  const findings = lintNsTemplateReadiness([ws], catalog).issues.filter(issue => issue.code === 'template.input.idWithoutSource');
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /projectId/);
});

test('T4: an unclassified workspace and an unavailable catalog degrade instead of failing', () => {
  const unclassified = workspace({ presentation: undefined });
  assert.equal(lintNsTemplateReadiness([unclassified], catalog).results[0].action, 'unclassified');

  const ws = workspace();
  const outcome = lintNsTemplateReadiness([ws], null);
  assert.equal(outcome.results[0].action, 'skipped');
  assert.equal(ws.presentation!.templateReady, undefined);
});

test('T6: coverage totals and the markdown table', () => {
  const ready = workspace();
  const orphan = workspace({ workspaceId: 'orphan', presentation: { categoryRef: 'operationsQueue', confidence: 4 } });
  const results = lintNsTemplateReadiness([ready, orphan], catalog).results;
  const coverage = buildNsTemplateCoverage('buildFlowFsm', results);

  assert.equal(coverage.totals.workspaces, 2);
  assert.equal(coverage.totals.templateReady, 2);
  assert.equal(coverage.totals.lowConfidence, 1, 'confidence < 6 is the new-category signal');

  const markdown = renderNsTemplateCoverage(coverage);
  assert.match(markdown, /## Template readiness \(category coverage\)/);
  assert.match(markdown, /\| queue \| operationsQueue \| 9 \| yes \| ok \|/);
  assert.match(markdown, /\| orphan \| operationsQueue \| 4 \| yes \| ok \|/);
});

test('T6: coverage aggregates by CATEGORY (the key that survives a replan)', () => {
  // Two workspaces on the same category + one that downgrades away from inventoryControl.
  const noMeasure = {
    bffId: 'taskList', kind: 'query' as const, uses: [{ operationId: 'listTasks' }],
    output: { kind: 'paginated' as const, fields: [
      { name: 'tasks', type: 'array' as const, from: 'listTasks.$items', item: { fields: [
        { name: 'taskId', from: 'listTasks.$items.taskId', type: 'string' as const },
        { name: 'label', from: 'listTasks.$items.label', type: 'string' as const },
      ] } },
    ] },
  };
  const results = lintNsTemplateReadiness([
    workspace({ workspaceId: 'queueA' }),
    workspace({ workspaceId: 'queueB', presentation: { categoryRef: 'operationsQueue', confidence: 5 } }),
    workspace({ workspaceId: 'wasInventory', bffCalls: [noMeasure], presentation: { categoryRef: 'inventoryControl', confidence: 7, alternates: [{ categoryRef: 'operationsQueue', confidence: 6, reason: 'queue' }] } }),
  ], catalog).results;
  const coverage = buildNsTemplateCoverage('m', results);

  const queue = coverage.byCategory.find(entry => entry.categoryRef === 'operationsQueue')!;
  assert.equal(queue.workspaces, 3, 'the two queues + the one that landed here after the downgrade');
  assert.equal(queue.downgradedInto, 1);
  assert.equal(queue.lowConfidence, 1, 'queueB (confidence 5) is the orphan signal');
  assert.equal(queue.avgConfidence, 6.7, 'rounded to 1 decimal (9 + 5 + 6) / 3');

  const inventory = coverage.byCategory.find(entry => entry.categoryRef === 'inventoryControl')!;
  assert.equal(inventory.downgradedAway, 1, 'the category that could not hold the workspace — split signal');
  assert.equal(inventory.workspaces, 0, 'it no longer holds any workspace after the downgrade');

  assert.match(renderNsTemplateCoverage(coverage), /### By category \(the key that survives a replan\)/);
});

test('T4: an untyped projection is REPORTED, never judged (type is optional in the e6 schema)', () => {
  // 102045 dashboardWorkspace: budget/actualCost declared with NO type at all. Requiring a numeric
  // measure there would blame a typing weakness for a semantic gap.
  const untyped = {
    bffId: 'stock', kind: 'query' as const, uses: [{ operationId: 'listStock' }],
    output: { kind: 'paginated' as const, fields: [
      { name: 'items', type: 'array' as const, from: 'listStock.$items', item: { fields: [
        { name: 'stockItemId', from: 'listStock.$items.stockItemId' },
        { name: 'quantity', from: 'listStock.$items.quantity' },
      ] } },
    ] },
  };
  const ws = workspace({ bffCalls: [untyped], presentation: { categoryRef: 'inventoryControl', confidence: 8 } });
  const outcome = lintNsTemplateReadiness([ws], catalog);
  assert.equal(outcome.results[0].action, 'skipped');
  assert.equal(ws.presentation!.templateReady, undefined, 'no readiness claim either way');
  assert.equal(ws.presentation!.categoryRef, 'inventoryControl', 'and no downgrade on a typing gap');
  assert.ok(outcome.issues.some(issue => issue.code === 'template.contract.unjudgeable'));
});
