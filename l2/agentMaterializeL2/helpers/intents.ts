/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/intents.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/agentIntents.ts, 05/10/2026; that original was removed with agentMaterializeL2v2 on 08/10/2026).

// Generic collab-messages intents for step agents: add a step, update a step status, and a completed
// result step used as a done-anchor. No agent policy lives here.

export function addAgentStep(
  context: mls.msg.ExecutionContext,
  parentStepId: number,
  step: mls.msg.AIPayload,
  bootstrap = false,
): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: bootstrap ? '' : context.message.orderAt,
    threadId: context.message.threadId,
    taskId: bootstrap ? '' : context.task?.PK || '',
    parentStepId,
    step,
  };
}

export function updateAgentStatus(
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

export function agentResult(title: string, result: string, planId: string): mls.msg.AIResultStep {
  return {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: title,
    result,
    planning: { planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
}
