/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildD2PlannedSteps, parseD2MessageInvocation, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

void test('/pages is the sole message and step entry and plans four ordered stages', () => {
  assert.deepEqual(parseD2MessageInvocation('@@agentDefsL2 controleEstoque /pages', 102047), { kind: 'run', project: 102047, module: 'controleEstoque', scope: 'pages' });
  assert.deepEqual(parseD2StepInvocation('{"project":102047,"module":"controleEstoque","scope":"pages"}', 102047), { kind: 'run', project: 102047, module: 'controleEstoque', scope: 'pages' });
  const steps = buildD2PlannedSteps({ project: 102047, module: 'controleEstoque' });
  assert.deepEqual(steps.map(step => step.planning?.planId), ['entry10', 'input20', 'pages50', 'finalize60']);
  assert.deepEqual(steps.map(step => step.planning?.dependsOn), [[], ['entry10-done'], ['input20-done'], ['pages50-done']]);
  assert.ok(steps.every(step => JSON.parse(step.prompt || '{}').scope === 'pages'));
  for (const command of ['@@agentDefsL2 controleEstoque', '@@agentDefsL2 controleEstoque /candidate', '@@agentDefsL2 controleEstoque /other', '@@agentDefsL2 ../bad /pages']) {
    assert.equal(parseD2MessageInvocation(command, 102047).kind, 'refusal');
  }
  assert.match((parseD2MessageInvocation('@@agentDefsL2 controleEstoque', 102047) as { diagnostic: string }).diagnostic, /Only \/pages is available/u);
  for (const args of ['{"project":102047,"module":"controleEstoque"}', '{"project":102047,"module":"controleEstoque","scope":"candidate"}', '{"project":102047,"module":"controleEstoque","scope":"pages","flag":true}']) {
    assert.equal(parseD2StepInvocation(args, 102047).kind, 'refusal');
  }
});
