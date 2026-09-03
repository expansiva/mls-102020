/// <mls fileReference="_102020_/l2/aura/agentManageHeader/agentGenerateHeader.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { logoStepIntent } from '/_102020_/l2/aura/agentManageHeader/agentGenerateHeader.js';
import { normalizeHeaderRequest } from '/_102020_/l2/aura/agentManageHeader/helpers/generateHeaderCore.js';

const context = {
  message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
  task: { PK: 'task-1' },
} as unknown as mls.msg.ExecutionContext;

const step = { stepId: 3 } as unknown as mls.msg.AIAgentStep;

function intent(overrides: Record<string, unknown> = {}) {
  const req = normalizeHeaderRequest({
    projectId: 999999,
    brand: { title: 'Sample App' },
    brief: 'clean and warm',
    logo: 'generate',
    requestId: 'hdr-1',
    ...overrides,
  });
  return logoStepIntent(context, step, req, 'defaultAura');
}

test('the queued logo step has the shape the planner accepts', () => {
  const added = intent();
  assert.equal(added.type, 'add-step');
  assert.equal(added.parentStepId, 3, 'the child hangs off the CURRENT step');
  assert.equal(added.taskId, 'task-1');

  const child = added.step as mls.msg.AIAgentStep;
  assert.equal(child.type, 'agent');
  assert.equal(child.agentName, 'agentGenerateLogo');
  assert.equal(child.interaction, null);
  // 'pending' means "already prepared" and the runtime refuses it:
  // "Step not prepared for continueBeforePrompt ... interaction:null".
  assert.equal(child.status, 'waiting_human_input');
  assert.deepEqual(child.planning?.dependsOn, []);
  assert.equal(child.planning?.executionMode, 'sequential');
  assert.equal(child.planning?.executionHost, 'client');
  assert.equal(child.stepId, 0);
});

test('the logo request carries the brand, the profile and the inherited brief', () => {
  const prompt = JSON.parse((intent().step as mls.msg.AIAgentStep).prompt ?? '{}');
  assert.equal(prompt.projectId, 999999);
  assert.equal(prompt.brandTitle, 'Sample App');
  assert.equal(prompt.brief, 'clean and warm', 'falls back to the header brief');
  assert.equal(prompt.style, 'monogram');
  assert.equal(prompt.profileName, 'defaultAura');
  assert.equal(prompt.commit, true);
  assert.equal(prompt.requestId, 'hdr-1-logo');
});

test('an explicit logo brief and style win over the header ones', () => {
  const prompt = JSON.parse(
    (intent({ logoBrief: 'cup and bean', logoStyle: 'mark' }).step as mls.msg.AIAgentStep).prompt ?? '{}',
  );
  assert.equal(prompt.brief, 'cup and bean');
  assert.equal(prompt.style, 'mark');
});
