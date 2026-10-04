/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { D2_HELP, buildD2PlannedSteps, parseD2MessageInvocation, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

void test('a bare module plans seven stages and /pages plans four', () => {
  assert.deepEqual(parseD2MessageInvocation('@@agentDefsL2 sampleModule', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'all' });
  assert.deepEqual(parseD2MessageInvocation('@@agentDefsL2 sampleModule /pages', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'pages' });
  assert.deepEqual(parseD2StepInvocation('{"project":102047,"module":"sampleModule","scope":"all"}', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'all' });
  assert.deepEqual(parseD2StepInvocation('{"project":102047,"module":"sampleModule","scope":"pages"}', 102047), { kind: 'run', project: 102047, module: 'sampleModule', scope: 'pages' });
  const full = buildD2PlannedSteps({ project: 102047, module: 'sampleModule', scope: 'all' });
  assert.deepEqual(full.map(step => step.planning?.planId), ['entry10', 'input20', 'pages50', 'bff55', 'shared60', 'contracts70', 'finalize80']);
  assert.deepEqual(full.map(step => step.planning?.dependsOn), [[], ['entry10-done'], ['input20-done'], ['pages50-done'], ['bff55-done'], ['shared60-done'], ['contracts70-done']]);
  assert.deepEqual(full.map(step => step.agentName), ['agentD2Entry', 'agentD2Input', 'agentD2Pages', 'agentD2Bff', 'agentD2Shared', 'agentD2Contracts70', 'agentD2Finalize']);
  const pages = buildD2PlannedSteps({ project: 102047, module: 'sampleModule', scope: 'pages' });
  assert.deepEqual(pages.map(step => step.planning?.planId), ['entry10', 'input20', 'pages50', 'finalize80']);
  assert.deepEqual(pages.map(step => step.planning?.dependsOn), [[], ['entry10-done'], ['input20-done'], ['pages50-done']]);
  assert.ok(full.every(step => JSON.parse(step.prompt || '{}').scope === 'all'));
  assert.ok(pages.every(step => JSON.parse(step.prompt || '{}').scope === 'pages'));
  assert.match(D2_HELP, /entry10, input20, pages50, bff55, shared60, contracts70 and finalize80/u);
  for (const command of ['@@agentDefsL2 sampleModule /candidate', '@@agentDefsL2 sampleModule /other', '@@agentDefsL2 ../bad']) {
    assert.equal(parseD2MessageInvocation(command, 102047).kind, 'refusal');
  }
  assert.match((parseD2MessageInvocation('@@agentDefsL2 sampleModule /candidate', 102047) as { diagnostic: string }).diagnostic, /\/candidate is not supported/u);
  assert.match((parseD2MessageInvocation('@@agentDefsL2 sampleModule /other', 102047) as { diagnostic: string }).diagnostic, /Unknown flag/u);
  for (const args of ['{"project":102047,"module":"sampleModule"}', '{"project":102047,"module":"sampleModule","scope":"candidate"}', '{"project":102047,"module":"sampleModule","scope":"pages","flag":true}']) {
    assert.equal(parseD2StepInvocation(args, 102047).kind, 'refusal');
  }
});
