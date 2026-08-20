/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cSteps.ts" enhancement="_blank"/>

// Task-step intent builders for the copy pipeline. Deliberately self-contained (the same
// choice vSteps/ntSteps/nmSteps made) so this agent has zero coupling to another agent's
// folder; the strict LLM tool plumbing IS shared and is re-exported at the bottom for the
// summary step.
//
// Orchestration rules honored (mls-base/skills/collab_messages.md):
// - parents auto-complete per intent — add the next OPEN step before any completed result /
//   update-status in the same batch;
// - downstream steps depend ONLY on 'cN-done' anchors;
// - EVERY outcome anchors, including the ones that write nothing (c2 without collisions).
//   A path that neither writes nor anchors is how a run goes green and hangs — the
//   i4-inherit defect of 2026-08-10.

import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';

export const C_PLAN_IDS = ['c1-bootstrap', 'c2-clarify', 'c3-copy', 'c4-less', 'c5-demo', 'c6-summary'] as const;
export type CPlanId = typeof C_PLAN_IDS[number];

export const C_STEP_AGENTS: Record<CPlanId, string> = {
  'c1-bootstrap': 'agentCopyBootstrap',
  'c2-clarify': 'agentCopyClarify',
  'c3-copy': 'agentCopyFiles',
  'c4-less': 'agentCopyLess',
  'c5-demo': 'agentCopyDemo',
  'c6-summary': 'agentCopySummary',
};

export function cDoneAnchor(planId: CPlanId): string {
  return `${planId.split('-')[0]}-done`; // 'c3-copy' -> 'c3-done'
}

export function cUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
): mls.msg.AgentIntentUpdateStatus {
  // traceMsg is accepted by the backend (production usage: nsSteps.ts/vSteps.ts) but the
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

export function cResultStepIntent(
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

// Status 'waiting_human_input' == runs immediately (engine convention).
export function cAgentStepIntent(
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

// Every step receives its planId and the runKey — the runKey is what names the work folder
// of a batch (a batch has no single shortName). Pattern: agentImproveMolecule2 getImRunKey.
export function cParseStepArgs(value: unknown): { planId?: string; runKey?: string } {
  const parsed = parseMaybeJsonLocal(value);
  if (typeof parsed !== 'object' || parsed === null) return {};
  const record = parsed as Record<string, unknown>;
  return {
    planId: typeof record.planId === 'string' ? record.planId : undefined,
    runKey: typeof record.runKey === 'string' ? record.runKey : undefined,
  };
}

// ---- checkpoint plumbing (c2-clarify) ----------------------------------------
// Ported from agentNewTheme/helpers/ntSteps (the t2-clarify precedent). A clarification is
// EMITTED into the agent step's own payload; the human answer becomes a completed
// 'cN-done' result the next step dependsOn.

export function cClarificationPromptReady(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  hookSequential: number,
  args: { planId: string; systemPrompt: string; humanPrompt: string; stepArgs?: string },
): mls.msg.AgentIntentPromptReady {
  return {
    type: 'prompt_ready',
    args: args.stepArgs || JSON.stringify({ planId: args.planId }),
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    systemPrompt: args.systemPrompt,
    humanPrompt: args.humanPrompt,
  } as mls.msg.AgentIntentPromptReady;
}

export function cAnswerResultIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: { planId: string; stepTitle: string; result: unknown },
): mls.msg.AgentIntentAddStep {
  return cResultStepIntent(context, parentStep, { planId: args.planId, dependsOn: [], stepTitle: args.stepTitle, result: args.result });
}

// The emitting step's payload must be a { type: 'clarification', json } envelope — otherwise
// the widget never mounts. Returns a readable error instead of throwing.
export function cCheckClarificationPayload(payload: unknown, planId: string): string {
  const parsed = parseMaybeJsonLocal(payload);
  const result = isRecordLocal(parsed) && parsed.type === 'flexible' ? parseMaybeJsonLocal(parsed.result) : parsed;
  if (!isRecordLocal(result)) return `${planId} did not return a payload object`;
  if (result.type === 'result') return typeof result.result === 'string' ? result.result : `${planId} returned a result error`;
  if (result.type !== 'clarification') return `${planId} returned an invalid payload type: ${String(result.type)}`;
  const json = parseMaybeJsonLocal(result.json);
  if (!isRecordLocal(json) || json.planId !== planId) return `${planId} clarification json is invalid`;
  return '';
}

// Widget callbacks run OUTSIDE the pooling cycle: they apply their own intents and then
// resume the task.
export async function cApplyIntentsAndRefresh(
  context: mls.msg.ExecutionContext,
  intents: mls.msg.AgentIntent[],
  resume: boolean,
): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || 'Error applying checkpoint intents');
  }
  const ret = response as mls.msg.ResponseApplyIntents;
  context.task = ret.task;
  if (ret.message) context.message = ret.message;
  if (resume) await continuePoolingTask(context);
}

// The backend rejects add-step/update-status on a completed/failed parent. When the original
// parent was auto-completed, fall back to the nearest mutable agent step.
export function cFindMutableParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const current = findStepById(context, parentStep.stepId);
  if (isMutableAgentStep(current)) return current;

  const ownerParentId = findParentStepId(context, parentStep.stepId);
  const ownerParent = ownerParentId ? findStepById(context, ownerParentId) : null;
  if (isMutableAgentStep(ownerParent)) return ownerParent;

  const root = context.task?.iaCompressed?.nextSteps?.[0] || null;
  if (isMutableAgentStep(root)) return root;

  return parentStep;
}

function isMutableAgentStep(step: mls.msg.AIPayload | null): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function findStepById(context: mls.msg.ExecutionContext, stepId: number): mls.msg.AIPayload | null {
  if (!context.task) return null;
  return getAllSteps(context.task.iaCompressed?.nextSteps).find(item => item.stepId === stepId) || null;
}

function findParentStepId(context: mls.msg.ExecutionContext, childStepId: number): number | null {
  if (!context.task) return null;
  for (const item of getAllSteps(context.task.iaCompressed?.nextSteps)) {
    if (item.nextSteps?.some(child => child.stepId === childStepId)) return item.stepId;
    if (item.interaction?.payload?.some(child => child.stepId === childStepId)) return item.stepId;
  }
  return null;
}

function isRecordLocal(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ---- strict tool plumbing: SHARED (l2/aura/molecules/shared/llmTool) ----------
// Only c6-summary may need it; re-exported here so the step imports from cSteps.
export type { VToolOutput as CToolOutput, VLlmTool as CLlmTool } from '/_102020_/l2/aura/molecules/shared/llmTool.js';
export { createVToolSchema, buildVToolInstruction, extractVToolOutput } from '/_102020_/l2/aura/molecules/shared/llmTool.js';

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
