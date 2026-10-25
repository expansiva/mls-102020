/// <mls fileReference="_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CLOSE_PLAN,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  currentMasterProject,
  currentProjectNumber,
  materializerOutcome,
  parseNrInvocation,
  planIdOf,
  readChangeEffort,
} from '/_102020_/l2/agentNewReleaseL2/helpers/steps.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: NR_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentNewReleaseL2',
    agentDescription: 'Applies a frontend change-effort by materializing only the listed pages.',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNrInvocation(userPrompt || context.message.content || '');
  if (!invocation.ok) return [statusMessage(agent, context, invocation.help)];

  const project = currentProjectNumber();
  if (!Number.isSafeInteger(project) || project <= 0) {
    return [statusMessage(agent, context, 'The current project is unavailable.')];
  }

  const loaded = await readChangeEffort(invocation.module);
  if (!loaded.ok) return [statusMessage(agent, context, loaded.reason)];

  const plan = planNewReleaseL2(loaded.effort, currentMasterProject());
  if (!plan.ok) return [statusMessage(agent, context, plan.reason)];

  const steps = buildApplySteps(project, invocation.module, plan.pages).map(step => addStepIntent(context, step));
  return [openMessage(agent, context, invocation.module, project), ...steps];
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (planIdOf(step) !== NR_CLOSE_PLAN) {
    const notice = context.task?.iaCompressed?.longMemory?.notice || 'Deterministic message bootstrap completed.';
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', notice)];
  }
  const materialize = getAllSteps(context.task?.iaCompressed?.nextSteps).find(item => planIdOf(item) === NR_MATERIALIZE_PLAN);
  const outcome = materializerOutcome(materialize);
  return [updateStatus(context, parentStep, step, hookSequential, outcome.status, outcome.message)];
}

function openMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  project: number,
): mls.msg.AgentIntentAddMessageAI {
  return {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentNewReleaseL2 deterministic bootstrap. The root model is disabled.' },
        { type: 'human', content: moduleName },
      ],
      taskTitle: `release ${moduleName}`,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: NR_AGENT_NAME,
        flowName: NR_AGENT_NAME,
        moduleName,
        project: String(project),
      },
    },
  };
}

function statusMessage(
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
        { type: 'system', content: message },
        { type: 'human', content: message },
      ],
      taskTitle: NR_AGENT_NAME,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: NR_AGENT_NAME,
        flowName: NR_AGENT_NAME,
        statusOnly: 'true',
        notice: message,
      },
    },
  };
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

function updateStatus(
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
