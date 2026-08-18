import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveNs4MutableParent } from '/_102020_/l2/agentNewSolution/helpers/ns4StepTree.js';

function agent(stepId: number, status: mls.msg.AIStepStatus, nextSteps: mls.msg.AIPayload[] = []): mls.msg.AIAgentStep {
  return { type: 'agent', stepId, status, nextSteps, agentName: 'agentNewSolution', rags: [], interaction: null };
}

test('NS4 nests an initial dynamic step under its open phase instead of the root', () => {
  const phase = agent(5, 'waiting_after_prompt');
  const root = agent(1, 'in_progress', [phase]);

  assert.equal(resolveNs4MutableParent([root, phase], root, phase), phase);
});

test('NS4 keeps a technical child and a fan-out on their existing open parent', () => {
  const judge = agent(6, 'waiting_after_prompt');
  const fanOut = agent(7, 'in_progress');
  const phase = agent(5, 'in_progress', [judge, fanOut]);
  const root = agent(1, 'in_progress', [phase]);

  assert.equal(resolveNs4MutableParent([root, phase, judge, fanOut], phase, judge), phase);
  assert.equal(resolveNs4MutableParent([root, phase, judge, fanOut], fanOut, phase), fanOut);
});
