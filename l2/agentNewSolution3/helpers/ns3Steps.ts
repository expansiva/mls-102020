/// <mls fileReference="_102020_/l2/agentNewSolution3/helpers/ns3Steps.ts" enhancement="_blank"/>

// Generic task-step intent builders for ns3 phase-2 agents. Policy: step-agnostic —
// planIds, prompts and titles arrive as parameters. Orchestration rules honored here
// (see mls-base/skills/collab_messages.md):
// - parents auto-complete when all nextSteps children are completed/failed, and the
//   sweep runs PER INTENT — callers must add the next OPEN step before any completed
//   result / update-status in the same batch;
// - add-step/update-status are rejected on terminal parents — anchor on a mutable one.

import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';

export function ns3UpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    traceMsg,
  };
}

export function ns3ResultStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: { planId: string; dependsOn: string[]; stepTitle: string; result: unknown },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'result',
      stepId: 0,
      interaction: null,
      stepTitle: args.stepTitle,
      status: 'completed',
      nextSteps: [],
      result: JSON.stringify(args.result, null, 2),
      planning: { planId: args.planId, dependsOn: args.dependsOn, executionMode: 'manual_later', executionHost: 'client' },
    } as mls.msg.AIResultStep,
  };
}

// Dynamic agent step. Default status 'waiting_human_input': it is enqueued to run
// immediately (only 'waiting_dependency' steps park on dependsOn).
export function ns3AgentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: {
    agentName: string;
    stepTitle: string;
    planId: string;
    dependsOn?: string[];
    prompt: Record<string, unknown>;
    status?: mls.msg.AIStepStatus;
  },
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step: {
      type: 'agent',
      stepId: 0,
      interaction: null,
      stepTitle: args.stepTitle,
      status: args.status || 'waiting_human_input',
      nextSteps: [],
      agentName: args.agentName,
      prompt: JSON.stringify(args.prompt),
      rags: [],
      planning: { planId: args.planId, dependsOn: args.dependsOn || [], executionMode: 'sequential', executionHost: 'client' },
    } as mls.msg.AIAgentStep,
  };
}

export function ns3HasStepWithPlanId(context: mls.msg.ExecutionContext, planId: string): boolean {
  if (!context.task || !planId) return false;
  return getAllSteps(context.task.iaCompressed?.nextSteps).some(item =>
    (item as { planning?: { planId?: string } }).planning?.planId === planId
  );
}

export function ns3FindStepById(context: mls.msg.ExecutionContext, stepId: number): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => item.stepId === stepId) || null;
}

export function ns3FindParentStepId(context: mls.msg.ExecutionContext, childStepId: number): number | null {
  if (!context.task) return null;
  for (const item of getAllSteps(context.task.iaCompressed?.nextSteps)) {
    if (item.nextSteps?.some(child => child.stepId === childStepId)) return item.stepId;
    if (item.interaction?.payload?.some(child => child.stepId === childStepId)) return item.stepId;
  }
  return null;
}

export function ns3IsMutableAgentStep(step: mls.msg.AIPayload | null): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

// When the original parent was auto-completed by setStepCompletedIfChildrenCompleted,
// fall back to the nearest mutable agent step (owner parent, then root).
export function ns3FindMutableParentStep(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
): mls.msg.AIAgentStep {
  const current = ns3FindStepById(context, parentStep.stepId);
  if (ns3IsMutableAgentStep(current)) return current;

  const ownerParentId = ns3FindParentStepId(context, parentStep.stepId);
  const ownerParent = ownerParentId ? ns3FindStepById(context, ownerParentId) : null;
  if (ns3IsMutableAgentStep(ownerParent)) return ownerParent;

  const root = context.task?.iaCompressed?.nextSteps?.[0] || null;
  if (ns3IsMutableAgentStep(root)) return root;

  return parentStep;
}
