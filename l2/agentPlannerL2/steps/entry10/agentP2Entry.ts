/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/entry10/agentP2Entry.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  buildP2PlannedSteps,
  executeP2Entry,
  parseP2StepPrompt,
  plannedP2StepIds,
  type P2ExecuteResult,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  P2_STEP_HOOKS,
  drainWaitingSiblings,
  planIdOf,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';

export async function beforeP2EntryPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseP2StepPrompt(args || step.prompt || '');
  if (parsed.kind === 'refusal') {
    return refuse(context, parentStep, step, hookSequential, parsed.refusal);
  }

  const source = parsed.kind === 'step'
    ? parsed
    : { kind: 'hand' as const, moduleName: parsed.moduleName };
  const result = await executeP2Entry(source, new Date());
  if ('refusal' in result) {
    return refuse(context, parentStep, step, hookSequential, result.refusal);
  }

  const mutationParent = findOpenParent(context, parentStep);
  const extras = missingPlannedSteps(context, result).map(item => addStep(context, mutationParent, item));
  return [
    ...extras,
    doneAnchor(context, mutationParent, result),
    updateStatus(
      context,
      mutationParent,
      step,
      hookSequential,
      'completed',
      `entry10 recorded thread ${result.pipeline.thread} round ${result.pipeline.round}`,
    ),
  ];
}

export async function afterP2EntryPromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'entry10 already recorded.')];
}

function refuse(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  message: string,
): mls.msg.AgentIntent[] {
  return [
    ...drainWaitingSiblings(context, step, hookSequential, `stopped: ${message}`),
    updateStatus(context, parentStep, step, hookSequential, 'completed', message),
  ];
}

function missingPlannedSteps(
  context: mls.msg.ExecutionContext,
  result: Exclude<P2ExecuteResult, { refusal: string }>,
): mls.msg.AIAgentStep[] {
  const present = new Set(
    allSteps(context).map(item => planIdOf(item as mls.msg.AIAgentStep)).filter(Boolean),
  );
  return buildP2PlannedSteps(result.pipeline.moduleName, {
    thread: result.pipeline.thread,
    file: result.pipeline.messageFile,
  }, result.message).filter(item => {
    const id = item.planning?.planId || '';
    return id !== 'entry10' && !present.has(id);
  });
}

function doneAnchor(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  result: Exclude<P2ExecuteResult, { refusal: string }>,
): mls.msg.AgentIntentAddStep {
  return addStep(context, parentStep, {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: 'Entry done',
    status: 'completed',
    nextSteps: [],
    result: JSON.stringify({
      moduleName: result.pipeline.moduleName,
      thread: result.pipeline.thread,
      round: result.pipeline.round,
      messageFile: result.pipeline.messageFile,
      sourceMessages: result.pipeline.sourceMessages,
      completedStep: 'entry10',
      nextStep: plannedP2StepIds(result.message).find(id => id !== 'entry10') || '',
    }),
    planning: { planId: 'entry10-done', dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep);
}

function addStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIPayload,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

function findOpenParent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const current = allSteps(context).find(item => item.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  return root?.type === 'agent' ? root : parentStep;
}

function isOpenAgent(step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function allSteps(context: mls.msg.ExecutionContext): mls.msg.AIPayload[] {
  const root = context.task?.iaCompressed?.nextSteps || [];
  const out: mls.msg.AIPayload[] = [];
  const walk = (steps: mls.msg.AIPayload[]) => {
    for (const step of steps) {
      out.push(step);
      if (step.nextSteps?.length) walk(step.nextSteps);
    }
  };
  walk(root);
  return out;
}

P2_STEP_HOOKS.entry10 = {
  beforePromptStep: beforeP2EntryPromptStep,
  afterPromptStep: afterP2EntryPromptStep,
};
