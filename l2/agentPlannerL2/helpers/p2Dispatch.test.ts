/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { createAgent } from '/_102020_/l2/agentPlannerL2/agentPlannerL2.js';
import { createP2AgentStep, type P2StepId } from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  hooksFor,
  planIdOf,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';

const ENTRY = { thread: 'mensalidadesAcademia-20260918103000', file: 'l4/mensalidadesAcademia/pool/l2/a.json' };

function numberedStep(stepId: number, planId: P2StepId, status: mls.msg.AIStepStatus): mls.msg.AIAgentStep {
  const step = createP2AgentStep(planId, 'mensalidadesAcademia', ENTRY);
  step.stepId = stepId;
  step.status = status;
  return step;
}

void test('every declared step is hooked', () => {
  createAgent();
  assert.ok(P2_STEP_HOOKS.entry10?.beforePromptStep, 'entry10 hook must be registered');
  assert.ok(P2_STEP_HOOKS.menu20?.beforePromptStep, 'menu20 hook must be registered');
  assert.ok(P2_STEP_HOOKS.needs30?.beforePromptStep, 'needs30 hook must be registered');
  assert.ok(P2_STEP_HOOKS.workspaces20?.beforePromptStep, 'parked workspaces20 hook stays registered');
  assert.ok(P2_STEP_HOOKS.contracts30?.beforePromptStep, 'parked contracts30 hook stays registered');
  assert.ok(P2_STEP_HOOKS.shared40?.beforePromptStep, 'parked shared40 hook stays registered');
  assert.ok(P2_STEP_HOOKS.requests50?.beforePromptStep, 'parked requests50 hook stays registered');
});

void test('hooksFor routes an L4 prompt with no planId to entry10', () => {
  createAgent();
  const prompt = JSON.stringify({
    moduleName: 'mensalidadesAcademia',
    thread: ENTRY.thread,
    file: ENTRY.file,
  });
  assert.equal(hooksFor('', prompt)?.beforePromptStep, P2_STEP_HOOKS.entry10?.beforePromptStep);
  assert.equal(hooksFor('entry10-done', prompt), undefined);
});

void test('notImplemented drain leaves hooked siblings running', () => {
  const steps = [
    numberedStep(10, 'entry10', 'completed'),
    numberedStep(20, 'workspaces20', 'waiting_human_input'),
    numberedStep(30, 'contracts30', 'waiting_dependency'),
    numberedStep(40, 'shared40', 'waiting_dependency'),
    numberedStep(50, 'requests50', 'waiting_dependency'),
  ];
  const root: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 1,
    interaction: null,
    stepTitle: 'plan mensalidadesAcademia',
    status: 'waiting_human_input',
    nextSteps: steps,
    agentName: 'agentPlannerL2',
    prompt: '',
    rags: [],
    planning: { planId: 'root', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  };
  const context = {
    message: { orderAt: 'msg-1', threadId: 'thread-1', content: '' },
    task: { PK: 'task-1', iaCompressed: { nextSteps: [root], longMemory: {} } },
  } as mls.msg.ExecutionContext;

  createAgent();
  const intents = drainWaitingSiblings(context, steps[1], 1, 'stopped: awaiting step workspaces20', { onlyUnimplemented: true });
  assert.deepEqual(
    intents.map(intent => intent.stepId),
    [],
  );
  assert.equal(planIdOf(steps[1]), 'workspaces20');
});
