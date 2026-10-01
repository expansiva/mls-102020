/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/agentMaterializeL2v3.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildM3PlannedSteps } from '/_102020_/l2/agentMaterializeL2v3/agentMaterializeL2v3.js';
import { parseM3StepInvocation } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';

test('the root plans the 4 steps in order, each with the same prompt and the done markers as dependencies', () => {
  const steps = buildM3PlannedSteps({ project: 102047, module: 'controleEstoque', pages: ['produtos'], devices: ['desktop', 'mobile'], runDir: 'run_20261001143205' });
  assert.deepEqual(steps.map(step => step.planning?.planId), ['entry10', 'input20', 'contracts30', 'finalize90']);
  assert.deepEqual(steps.map(step => step.agentName), ['agentM3Entry', 'agentM3Input', 'agentM3Contracts', 'agentM3Finalize']);
  assert.deepEqual(steps.map(step => step.planning?.dependsOn), [[], ['entry10-done'], ['input20-done'], ['contracts30-done']]);
  assert.ok(steps.every(step => step.planning?.executionMode === 'sequential' && step.planning?.executionHost === 'client'));
  assert.equal(new Set(steps.map(step => step.prompt)).size, 1);
  const parsed = parseM3StepInvocation(steps[0].prompt, 102047);
  assert.equal(parsed.kind, 'run');
});
