/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.ts" enhancement="_blank"/>

// Task-step intent builders + clarification plumbing for agentNewMolecule2 (same shape as
// agentNewTheme/helpers/ntSteps and agentNewMoleculeVariant/helpers/vSteps — each agent keeps its
// own small module, free to diverge). The strict LLM tool plumbing is SHARED
// (l2/aura/molecules/shared/llmTool) and re-exported here so step files import everything from
// nmSteps.
//
// Orchestration rules honored (skills/collab_messages.md):
// - add the next OPEN step before any completed result / update-status in the batch;
// - downstream depends ONLY on 'nN-done' anchors;
// - a clarification is EMITTED into an agent step's own payload; the human answer becomes a
//   completed result the next step dependsOn.

import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import { NmPlanId } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';

export type { VToolOutput, VLlmTool } from '/_102020_/l2/aura/molecules/shared/llmTool.js';
export { createVToolSchema, buildVToolInstruction, extractVToolOutput } from '/_102020_/l2/aura/molecules/shared/llmTool.js';

// 'n4-render' -> 'n4-done'
export function nmDoneAnchor(planId: NmPlanId): string {
  return `${planId.split('-')[0]}-done`;
}

export function nmUpdateStatusIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg?: string,
  cleaner?: 'input' | 'input_output',
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
    ...(traceMsg ? { traceMsg } : {}),
    ...(cleaner ? { cleaner } : {}),
  } as mls.msg.AgentIntentUpdateStatus;
}

export function nmResultStepIntent(
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

// Dynamic agent step. status 'waiting_human_input' == runs immediately;
// 'waiting_dependency' waits for the dependsOn done anchors.
export function nmAgentStepIntent(
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

// The retry counter lives HERE — in the step's own args — not in longTermMemory: the old flow kept
// `fixCount` as a string in task memory, where it silently vanishes if the task is recreated.
export function nmParseStepArgs(value: unknown): { planId?: string; runKey?: string; retryAttempt?: number; retryContext?: string } {
  const parsed = parseMaybeJsonLocal(value);
  if (!isRecordLocal(parsed)) return {};
  return {
    planId: typeof parsed.planId === 'string' ? parsed.planId : undefined,
    runKey: typeof parsed.runKey === 'string' ? parsed.runKey : undefined,
    retryAttempt: typeof parsed.retryAttempt === 'number' ? parsed.retryAttempt : undefined,
    retryContext: typeof parsed.retryContext === 'string' ? parsed.retryContext : undefined,
  };
}

// ---- clarification plumbing (collab_messages.md "Rendering a checkpoint") ----
// The checkpoint step EMITS a clarification into its OWN payload; afterPromptStep returns [] to
// KEEP the payload so the widget stays mounted; beforeClarificationStep mounts the widget, which
// can rebuild its data from disk (plan.json / context.json).
export function nmClarificationPromptReady(
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

// The human answer becomes a completed result step: it both completes the emitting agent and
// unlocks downstream.
export function nmAnswerResultIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  args: { planId: string; stepTitle: string; result: unknown },
): mls.msg.AgentIntentAddStep {
  return nmResultStepIntent(context, parentStep, { planId: args.planId, dependsOn: [], stepTitle: args.stepTitle, result: args.result });
}

// The emitting step's payload must be a { type: 'clarification', json } envelope — otherwise the
// widget never mounts. Returns a readable error instead of throwing, so afterPromptStep can fail
// the step with a trace.
export function nmCheckClarificationPayload(payload: unknown, planId: string): string {
  const parsed = parseMaybeJsonLocal(payload);
  const result = isRecordLocal(parsed) && parsed.type === 'flexible' ? parseMaybeJsonLocal(parsed.result) : parsed;
  if (!isRecordLocal(result)) return `${planId} did not return a payload object`;
  if (result.type === 'result') return typeof result.result === 'string' ? result.result : `${planId} returned a result error`;
  if (result.type !== 'clarification') return `${planId} returned an invalid payload type: ${String(result.type)}`;
  const json = parseMaybeJsonLocal(result.json);
  if (!isRecordLocal(json) || json.planId !== planId) return `${planId} clarification json is invalid`;
  return '';
}

// Widget callbacks run OUTSIDE the pooling cycle: they apply their own intents and then resume
// the task.
export async function nmApplyIntentsAndRefresh(
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

// The backend rejects add-step/update-status on a completed/failed parent ("Parent step cannot be
// modified"). When the original parent was auto-completed by
// setStepCompletedIfChildrenCompleted, fall back to the nearest mutable agent step — the old flow
// hardcoded parentStepId: 1, which couples it to the tree's shape.
export function nmFindMutableParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
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

function isRecordLocal(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
