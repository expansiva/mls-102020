/// <mls fileReference="_102020_/l2/aura/helpers/agentStepStatus.ts" enhancement="_blank" />

// Status intents an agent hook returns to close its own step: completed or failed.
// Shared by the Aura agents (design system, header, logo).

/**
 * Mark the current step completed. `traceMsg` is an optional carrier the caller can read back from
 * the stream's hook-done intents (e.g. the plan's operations surfaced to the Studio UI).
 */
export function mkCompleted(
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
    traceMsg?: string,
): mls.msg.AgentIntentUpdateStatus {
    return {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep?.stepId ?? step.stepId,
        stepId: step.stepId,
        status: 'completed',
        ...(traceMsg ? { traceMsg } : {}),
    };
}

/** Mark the current step failed, surfacing the reason in traceMsg. */
export function mkFail(
    context: mls.msg.ExecutionContext,
    parentStep: mls.msg.AIAgentStep,
    step: mls.msg.AIAgentStep,
    hookSequential: number,
    traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
    return {
        type: 'update-status',
        hookSequential,
        messageId: context.message.orderAt,
        threadId: context.message.threadId,
        taskId: context.task?.PK || '',
        parentStepId: parentStep?.stepId ?? step.stepId,
        stepId: step.stepId,
        status: 'failed',
        traceMsg,
    };
}
