/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Intents.ts" enhancement="_blank"/>

export function addD2Step(
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

export function updateD2Status(
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

export function d2Result(title: string, result: string, planId: string): mls.msg.AIResultStep {
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
