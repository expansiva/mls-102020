/// <mls fileReference="_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CHECK_PLAN,
  NR_CLOSE_PLAN,
  NR_DEFS_PLAN,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  buildRegenerateSteps,
  currentProjectNumber,
  defsOutcome,
  guardAfterDefs,
  markedPageIds,
  marksDifferMessage,
  materializerOutcome,
  parseNrInvocation,
  planIdOf,
  readChangeEffort,
  readPoolEffort,
  readProductSnapshot,
  reviewDefsRun,
  statusIntents,
  writeReleaseSnapshot,
} from '/_102020_/l2/agentNewReleaseL2/helpers/steps.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: NR_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentNewReleaseL2',
    agentDescription: 'Applies a frontend change-effort by regenerating the marked pages or materializing them.',
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
  if (!invocation.ok) return statusMessage(agent, context, invocation.help);

  const project = currentProjectNumber();
  if (!Number.isSafeInteger(project) || project <= 0) {
    return statusMessage(agent, context, 'The current project is unavailable.');
  }

  const loaded = await readChangeEffort(invocation.module);
  if (!loaded.ok) return statusMessage(agent, context, loaded.reason);

  const plan = planNewReleaseL2(loaded.effort, String(agent.agentProject));
  if (!plan.ok) return statusMessage(agent, context, plan.reason);

  if (plan.mode === 'materialize') {
    const steps = buildApplySteps(project, invocation.module, plan.pages).map(step => addStepIntent(context, step));
    return [openMessage(agent, context, invocation.module, project, {}), ...steps];
  }

  const marked = markedPageIds(await readPoolEffort(invocation.module));
  const differ = marksDifferMessage(marked, plan.pages);
  if (differ) return statusMessage(agent, context, differ);

  await writeReleaseSnapshot(invocation.module, await readProductSnapshot(invocation.module));
  const steps = buildRegenerateSteps(project, invocation.module).map(step => addStepIntent(context, step));
  return [openMessage(agent, context, invocation.module, project, {
    nrPages: plan.pages.join(','),
    nrMaterializeOnly: plan.materializeOnly.join(','),
  }), ...steps];
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const planId = planIdOf(step);
  if (planId === NR_CHECK_PLAN) return reviewCheck(context, parentStep, step, hookSequential);
  if (planId !== NR_CLOSE_PLAN) {
    const notice = context.task?.iaCompressed?.longMemory?.notice || 'Deterministic message bootstrap completed.';
    return [updateStatus(context, parentStep, step, hookSequential, 'completed', notice)];
  }
  const materialize = getAllSteps(context.task?.iaCompressed?.nextSteps).find(item => planIdOf(item) === NR_MATERIALIZE_PLAN);
  const outcome = materializerOutcome(materialize);
  return [updateStatus(context, parentStep, step, hookSequential, outcome.status, outcome.message)];
}

async function reviewCheck(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const memory = context.task?.iaCompressed?.longMemory;
  const moduleName = String(memory?.moduleName || '');
  const pages = String(memory?.nrPages || '').split(',').map(id => id.trim()).filter(Boolean);
  const materializeOnly = String(memory?.nrMaterializeOnly || '').split(',').map(id => id.trim()).filter(Boolean);
  const defs = getAllSteps(context.task?.iaCompressed?.nextSteps).find(item => planIdOf(item) === NR_DEFS_PLAN);
  const defsResult = defsOutcome(defs);
  const guard = defsResult.status === 'completed' ? await guardAfterDefs(moduleName, pages) : null;
  if (defsResult.status === 'completed' && !guard) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', 'release snapshot is missing')];
  }
  const review = reviewDefsRun(defsResult, guard || { created: [], changed: [], deleted: [], outside: [] });
  const status = updateStatus(context, parentStep, step, hookSequential, review.status, review.message);
  if (!review.addMaterialize) return [status];
  const project = currentProjectNumber();
  const added = buildApplySteps(project, moduleName, pages, materializeOnly).map(item => addStepIntent(context, item));
  return [status, ...added];
}

function openMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  project: number,
  extra: Record<string, string>,
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
        ...extra,
      },
    },
  };
}

function statusMessage(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
): mls.msg.AgentIntent[] {
  return statusIntents(agent.agentName, context.message.threadId, context.message.content, message);
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
