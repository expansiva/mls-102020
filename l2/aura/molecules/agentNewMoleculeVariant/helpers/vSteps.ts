/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.ts" enhancement="_blank"/>

// Task-step intent builders + LLM tool plumbing for the variant pipeline.
// Deliberately self-contained (mirrors agentNewSolution/helpers/nsSteps.ts and
// nsLlm.ts) so this agent has zero coupling to another agent's folder.
// Orchestration rules honored (mls-base/skills/collab_messages.md):
// - parents auto-complete per intent — add the next OPEN step before any
//   completed result / update-status in the same batch;
// - downstream steps depend ONLY on 'vN-done' anchors (retries have dynamic planIds).

export const V_PLAN_IDS = ['v1-bootstrap', 'v2-shell', 'v3-less', 'v4-index', 'v5-demo', 'v6-summary'] as const;
export type VPlanId = typeof V_PLAN_IDS[number];

export function vDoneAnchor(planId: VPlanId): string {
  return `${planId.split('-')[0]}-done`; // 'v3-less' -> 'v3-done'
}

export function vUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  // traceMsg is accepted by the backend (production usage: nsSteps.ts) but the
  // local mls.d.ts is behind — hence the assertion instead of a typed literal.
  const intent = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status,
    ...(traceMsg ? { traceMsg } : {}),
    ...(cleaner ? { cleaner } : {}),
  } as mls.msg.AgentIntentUpdateStatus;
  return intent;
}

export function vResultStepIntent(
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

// Dynamic agent step (retries). Status 'waiting_human_input' == runs immediately.
export function vAgentStepIntent(
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

export function vParseStepArgs(value: unknown): { planId?: string; retryAttempt?: number; retryContext?: string } {
  const parsed = parseMaybeJsonLocal(value);
  if (typeof parsed !== 'object' || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  return {
    planId: typeof record.planId === 'string' ? record.planId : undefined,
    retryAttempt: typeof record.retryAttempt === 'number' ? record.retryAttempt : undefined,
    retryContext: typeof record.retryContext === 'string' ? record.retryContext : undefined,
  };
}

// ---- strict tool plumbing: now SHARED (l2/aura/molecules/shared/llmTool) ----
// Re-exported so this agent's steps and vSteps.test keep importing from vSteps.
export type { VToolOutput, VLlmTool } from '/_102020_/l2/aura/molecules/shared/llmTool.js';
export { createVToolSchema, buildVToolInstruction, extractVToolOutput } from '/_102020_/l2/aura/molecules/shared/llmTool.js';

// Local JSON parse kept for vParseStepArgs (the tool plumbing now lives in shared/llmTool).
function parseMaybeJsonLocal(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}
