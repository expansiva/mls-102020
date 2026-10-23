/// <mls fileReference="_102020_/l2/agentAssistant/helpers/asSteps.ts" enhancement="_blank"/>

// Task-engine plumbing for agentAssistant (rules in mls-base/skills/collab_messages.md):
// - every round is a NEW agent step 'ask-<n>' added under the root, BEFORE the completed
//   'ask-<n>-answer' result and the update-status that close the previous round;
// - a clarification is emitted into the asking step's own payload, never as a flat sibling;
// - the conversation state lives in the task longMemory (key AS_MEMORY_KEY), written before the
//   step that reads it is added.

import { msgApplyIntents } from '/_102036_/l2/shared/api.js';
import { addOrUpdateTask, updateThreadPendingTasks } from '/_102036_/l2/collabMessagesIndexedDB.js';
import { appendLongTermMemory, getAllSteps, notifyTaskChange, notifyThreadChange } from '/_102027_/l2/aiAgentHelper.js';
import { continuePoolingTask } from '/_102027_/l2/aiAgentOrchestration.js';
import type { AsState } from '/_102020_/l2/agentAssistant/helpers/asTypes.js';
import { parseState } from '/_102020_/l2/agentAssistant/helpers/asPlan.js';
import { AS_MEMORY_KEY } from '/_102020_/l2/agentAssistant/helpers/asIds.js';

export function planIdOf(step: mls.msg.AIPayload): string {
  return step.planning?.planId || '';
}

export function readState(context: mls.msg.ExecutionContext): AsState | null {
  return parseState(context.task?.iaCompressed?.longMemory?.[AS_MEMORY_KEY]);
}

export async function saveState(context: mls.msg.ExecutionContext, state: AsState): Promise<void> {
  const task = await appendLongTermMemory(context, { [AS_MEMORY_KEY]: JSON.stringify(state) });
  if (task) context.task = task;
}

export function rootStep(context: mls.msg.ExecutionContext): mls.msg.AIAgentStep {
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (!root || root.type !== 'agent') throw new Error('[agentAssistant] task has no root agent step');
  return root as mls.msg.AIAgentStep;
}

export function updateStatusIntent(
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
  };
}

export function resultStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  args: { planId: string; stepTitle: string; result: unknown },
): mls.msg.AgentIntentAddStep {
  const step: mls.msg.AIResultStep = {
    type: 'result',
    stepId: 0,
    interaction: null,
    stepTitle: args.stepTitle,
    status: 'completed',
    nextSteps: [],
    result: typeof args.result === 'string' ? args.result : JSON.stringify(args.result, null, 2),
    planning: { planId: args.planId, dependsOn: [], executionMode: 'manual_later', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

// status 'waiting_human_input' = runs immediately (its beforePromptStep is queued).
export function agentStepIntent(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  args: { agentName: string; planId: string; stepTitle: string },
): mls.msg.AgentIntentAddStep {
  const step: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: args.stepTitle,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: args.agentName,
    prompt: JSON.stringify({ planId: args.planId }),
    rags: [],
    planning: { planId: args.planId, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  return {
    type: 'add-step',
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    parentStepId: parentStep.stepId,
    step,
  };
}

// Widget callbacks run outside the pooling cycle, so they must do what the orchestration does
// after msgApplyIntents (aiAgentOrchestration._processIntentsStream / finishClarification):
// refresh the thread's pending tasks, persist the task, THEN notify — the task view re-reads the
// task from the store on 'task-change'. Without it a task that ends here ('done') never
// re-renders: continuePoolingTask returns at once for a task that is no longer in progress,
// and the screen stays on the answered widget.
export async function applyIntentsAndResume(context: mls.msg.ExecutionContext, intents: mls.msg.AgentIntent[]): Promise<void> {
  const response = await msgApplyIntents({ userId: context.message.senderId, intents });
  if (!response || response.statusCode !== 200) {
    throw new Error((response as mls.msg.ResponseBase | undefined)?.msg || '[agentAssistant] error applying intents');
  }
  const applied = response as mls.msg.ResponseApplyIntents;
  context.task = applied.task;
  if (applied.message) context.message = applied.message;
  await refreshThreadPending(context.message.threadId, applied.task.PK);
  await addOrUpdateTask(applied.task);
  notifyTaskChange(context);
  await continuePoolingTask(context);
}

async function refreshThreadPending(threadId: string, taskId: string): Promise<void> {
  try {
    const thread = await updateThreadPendingTasks(threadId, taskId);
    if (thread) notifyThreadChange(thread as unknown as mls.msg.Thread);
  } catch (error) {
    // a thread missing from the local cache only means there is no badge to refresh
    console.warn(`[agentAssistant] thread pending tasks not refreshed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// The backend refuses add-step/update-status under a completed/failed parent; when the
// original parent was auto-completed, fall back to the nearest open agent step or the root.
export function mutableParent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const all = context.task ? getAllSteps(context.task.iaCompressed?.nextSteps) : [];
  const isOpenAgent = (step: mls.msg.AIPayload | undefined): step is mls.msg.AIAgentStep =>
    step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
  const current = all.find(step => step.stepId === parentStep.stepId);
  if (isOpenAgent(current)) return current;
  const root = context.task?.iaCompressed?.nextSteps?.[0];
  if (isOpenAgent(root)) return root;
  return parentStep;
}
