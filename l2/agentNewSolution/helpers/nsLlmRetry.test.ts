/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsLlmRetry.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { nsLlmInfraCause, nsLlmInfraFailureIntents } from '/_102020_/l2/agentNewSolution/helpers/nsLlmRetry.js';

const step = (interaction: unknown) => ({ stepId: 7, type: 'agent', interaction } as unknown as mls.msg.AIAgentStep);
const context = { message: { orderAt: 1, threadId: 't' }, task: { PK: 'task#1' } } as unknown as mls.msg.ExecutionContext;
const parent = { stepId: 2, type: 'agent' } as unknown as mls.msg.AIAgentStep;

void test('nsLlmInfraCause: a present payload is NOT an infra failure', () => {
  assert.equal(nsLlmInfraCause(step({ payload: [{ status: 'ok' }], trace: [] })), null);
});

void test('nsLlmInfraCause: no payload surfaces the infra cause from the trace', () => {
  const cause = nsLlmInfraCause(step({ payload: null, trace: ['Error invoking Collab LLM proxy: 402 no credits'] }));
  assert.ok(cause && cause.includes('402'));
});

void test('nsLlmInfraCause: no payload and no trace still reports a cause', () => {
  assert.equal(nsLlmInfraCause(step({ payload: null, trace: [] })), 'LLM call returned no payload');
});

function intents(alreadyRetried: boolean, interaction: unknown) {
  return nsLlmInfraFailureIntents({
    context, mutationParent: parent, step: step(interaction), hookSequential: 0,
    agentName: 'agentNsJourneyMap', stepId: 'e6-journey-map', retryPrompt: { moduleName: 'petShop' }, alreadyRetried,
  });
}

void test('a present payload yields null (proceed normally)', () => {
  assert.equal(intents(false, { payload: [{ status: 'ok' }] }), null);
});

void test('first LLM-call failure spawns exactly one retry step + completes with trace', () => {
  const result = intents(false, { payload: null, trace: ['proxy timeout'] })!;
  assert.equal(result.length, 2);
  const addStep = result.find(i => i.type === 'add-step') as mls.msg.AgentIntentAddStep;
  assert.ok(addStep, 'a retry step is added');
  const retryPrompt = JSON.parse((addStep.step as mls.msg.AIAgentStep).prompt || '{}');
  assert.equal(retryPrompt.llmRetry, true);
  assert.equal(retryPrompt.planId, 'e6-journey-map');
  assert.equal((addStep.step as mls.msg.AIAgentStep).onFailure, 'wait_after_prompt');
  const status = result.find(i => i.type === 'update-status') as mls.msg.AgentIntentUpdateStatus;
  assert.equal(status.status, 'completed');
});

void test('a second LLM-call failure (budget exhausted) fails with a truthful infra message', () => {
  const result = intents(true, { payload: null, trace: ['Error executing AI task: 500'] })!;
  assert.equal(result.length, 1);
  const status = result[0] as mls.msg.AgentIntentUpdateStatus;
  assert.equal(status.status, 'failed');
  assert.ok((status.traceMsg || '').startsWith('LLM infra failure:'));
});
