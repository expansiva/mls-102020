/// <mls fileReference="_102020_/l2/agentPlannerL2/helpers/p2Dispatch.ts" enhancement="_blank"/>

import type { IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { writeJson } from '/_102035_/l2/solution/fs.js';
import {
  P2_AGENT_NAME,
  ownerStepId,
  p2PipelineFile,
  type P2PipelineState,
  type P2StepId,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';

export type P2StepBeforePrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export type P2StepAfterPrompt = (
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
) => Promise<mls.msg.AgentIntent[]>;

export interface P2StepHooks {
  beforePromptStep?: P2StepBeforePrompt;
  afterPromptStep?: P2StepAfterPrompt;
}

/** Filled by later specs. A missing entry means the step is not implemented yet. */
export const P2_STEP_HOOKS: Partial<Record<P2StepId, P2StepHooks>> = {};

export function planIdOf(step: mls.msg.AIAgentStep): string {
  return step.planning?.planId || '';
}

export function hooksFor(planId: string, prompt?: string): P2StepHooks | undefined {
  const stepId = ownerStepId(planId, prompt);
  if (stepId) return P2_STEP_HOOKS[stepId];
  return undefined;
}

export async function markAwaitingStep(
  pipeline: P2PipelineState,
  stepId: P2StepId,
): Promise<P2PipelineState> {
  const next: P2PipelineState = {
    ...pipeline,
    status: 'awaitingStep',
    awaitingStep: stepId,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(p2PipelineFile(pipeline.moduleName), next);
  return next;
}

export function p2StatusMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: `<!-- modelType: general -->\n${message}` },
        { type: 'human', content: message },
      ],
      taskTitle: 'planner L2',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'plannerL2', flowName: P2_AGENT_NAME, statusOnly: 'true' },
    },
  };
}

export function updateStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
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
    cleaner: 'input_output',
    traceMsg,
  };
}

export function drainWaitingSiblings(
  context: mls.msg.ExecutionContext,
  current: mls.msg.AIAgentStep,
  hookSequential: number,
  traceMsg: string,
  opts?: { onlyUnimplemented?: boolean },
): mls.msg.AgentIntentUpdateStatus[] {
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (!root) return [];
  const intents: mls.msg.AgentIntentUpdateStatus[] = [];
  for (const sibling of walk(root.nextSteps || [])) {
    if (sibling.stepId === current.stepId) continue;
    if (sibling.status === 'completed' || sibling.status === 'failed') continue;
    if (opts?.onlyUnimplemented && hooksFor(planIdOf(sibling as mls.msg.AIAgentStep), (sibling as mls.msg.AIAgentStep).prompt)) continue;
    intents.push(updateStatus(context, root, sibling, hookSequential, 'completed', traceMsg));
  }
  return intents;
}

function walk(steps: mls.msg.AIPayload[]): mls.msg.AIPayload[] {
  const out: mls.msg.AIPayload[] = [];
  for (const step of steps) {
    out.push(step);
    if (step.nextSteps?.length) out.push(...walk(step.nextSteps));
  }
  return out;
}
