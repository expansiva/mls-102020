/// <mls fileReference="_102020_/l2/agentPlannerL2/agentPlannerL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';
import {
  P2_AGENT_NAME,
  buildP2PlannedSteps,
  isP2StepId,
  loadP2Entry,
  parseP2Invocation,
  p2InvocationRefusal,
  readP2Pipeline,
  type P2StepId,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';
import {
  drainWaitingSiblings,
  hooksFor,
  markAwaitingStep,
  p2StatusMessage,
  planIdOf,
  updateStatus,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import '/_102020_/l2/agentPlannerL2/steps/entry10/agentP2Entry.js';
import '/_102020_/l2/agentPlannerL2/steps/workspaces20/agentP2Workspaces.js';
import '/_102020_/l2/agentPlannerL2/steps/contracts30/agentP2Contracts.js';
import '/_102020_/l2/agentPlannerL2/steps/shared40/agentP2Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: P2_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentPlannerL2',
    agentDescription: 'L2 planner — contracts and shared defs from a finished l4, driven by pool/l2',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseP2Invocation(userPrompt || context.message.content || '');
  const syntax = p2InvocationRefusal(invocation);
  if (syntax) return statusTask(agent, context, syntax);

  const loaded = await loadP2Entry({ kind: 'hand', moduleName: invocation.module });
  if ('refusal' in loaded) return statusTask(agent, context, loaded.refusal);

  const entry = { thread: loaded.message.thread, file: displayPath(loaded.file) };
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentPlannerL2 deterministic bootstrap. The root LLM is skipped by AgentIntentAddMessageAI.skipRootLLM.' },
        { type: 'human', content: invocation.module },
      ],
      taskTitle: `plan l2 ${invocation.module}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'plannerL2',
        flowName: P2_AGENT_NAME,
        moduleName: invocation.module,
        thread: entry.thread,
        file: entry.file,
      },
    },
  };

  const steps = buildP2PlannedSteps(invocation.module, entry).map(step => addStepIntent(context, step));
  return [addMessage, ...steps];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId, args || step.prompt);
  if (hooks?.beforePromptStep) return hooks.beforePromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isP2StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  const hooks = hooksFor(planId, args || step.prompt);
  if (hooks?.afterPromptStep) return hooks.afterPromptStep(agent, context, parentStep, step, hookSequential, args);
  if (isP2StepId(planId)) return notImplemented(context, parentStep, step, hookSequential, planId);
  return [updateStatus(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function notImplemented(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  stepId: P2StepId,
): Promise<mls.msg.AgentIntent[]> {
  const moduleName = memoryString(context, 'moduleName') || moduleNameFromPrompt(step);
  if (moduleName) {
    const pipeline = await readP2Pipeline(moduleName);
    if (pipeline) await markAwaitingStep(pipeline, stepId);
  }
  const traceMsg = `step ${stepId} not implemented yet`;
  return [
    ...drainWaitingSiblings(context, step, hookSequential, `stopped: awaiting step ${stepId}`, { onlyUnimplemented: true }),
    updateStatus(context, parentStep, step, hookSequential, 'completed', traceMsg),
  ];
}

function addStepIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  return {
    type: 'add-step',
    messageId: '',
    threadId: context.message.threadId,
    taskId: '',
    parentStepId: 1,
    step,
  };
}

function statusTask(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string): mls.msg.AgentIntent[] {
  const addMessage = p2StatusMessage(agent, context, message);
  const result: mls.msg.AIPayload = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Status',
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, addStepIntent(context, result)];
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function moduleNameFromPrompt(step: mls.msg.AIAgentStep): string {
  try {
    const parsed = JSON.parse(String(step.prompt || '{}')) as { moduleName?: unknown };
    return typeof parsed.moduleName === 'string' ? parsed.moduleName : '';
  } catch {
    return '';
  }
}
