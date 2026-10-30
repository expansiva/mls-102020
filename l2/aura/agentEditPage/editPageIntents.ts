/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageIntents.ts" enhancement="_blank"/>

// The collab-messages intents agentEditPage emits (add a step, update a step, the prompt of a step). Private to
// this folder: no other agent's intents module is imported (skills/agentCodeIsPrivate.md).

import { EDIT_PAGE_GATE_AGENT_NAME, EDIT_PAGE_PATCH_AGENT_NAME, type EditPageStepArgs } from '/_102020_/l2/aura/agentEditPage/editPageCore.js';

export function addStep(context: mls.msg.ExecutionContext, parentStepId: number, step: mls.msg.AIPayload, bootstrap = false): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: bootstrap ? '' : context.message.orderAt,
    threadId: context.message.threadId,
    taskId: bootstrap ? '' : context.task?.PK || '',
    parentStepId,
    step,
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

export function promptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  systemPrompt: string,
  humanPrompt: string,
  tool: { name: string; description: string; parameters: Record<string, unknown> },
): mls.msg.AgentIntent {
  return {
    type: 'prompt_ready', args: step.prompt || '', messageId: context.message.orderAt, threadId: context.message.threadId,
    taskId: context.task?.PK || '', hookSequential, parentStepId: parentStep.stepId, systemPrompt, humanPrompt,
    tools: [{ type: 'function', function: tool }],
    toolChoice: { type: 'function', function: { name: tool.name } },
  } as mls.msg.AgentIntent;
}

function agentStep(agentName: string, title: string, planId: string, args: EditPageStepArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: title, status: 'waiting_human_input', nextSteps: [],
    agentName, prompt: JSON.stringify(args), rags: [],
    planning: { planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

export function gateStep(args: EditPageStepArgs): mls.msg.AIAgentStep {
  return agentStep(EDIT_PAGE_GATE_AGENT_NAME, `Plan the change of ${args.page}`, `editPage-gate-${args.page}`, args);
}

export function patchStep(args: EditPageStepArgs): mls.msg.AIAgentStep {
  return agentStep(EDIT_PAGE_PATCH_AGENT_NAME, `Change ${args.page}${args.attempt > 1 ? ' (repair)' : ''}`, `editPage-patch-${args.page}-${args.attempt}`, args);
}
