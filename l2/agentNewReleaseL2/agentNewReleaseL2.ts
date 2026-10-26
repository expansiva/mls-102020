/// <mls fileReference="_102020_/l2/agentNewReleaseL2/agentNewReleaseL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { deleteFile } from '/_102027_/l2/libStor.js';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CHECK_PLAN,
  NR_CLOSE_PLAN,
  NR_DEFS_PLAN,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  buildRegenerateSteps,
  closeNotice,
  currentProjectNumber,
  deletedPaths,
  defsOutcome,
  deleteGeneratedFiles,
  guardAfterDefs,
  markedPageIds,
  marksDifferMessage,
  materializerOutcome,
  parseNrInvocation,
  planIdOf,
  readChangeEffort,
  readPoolEffort,
  readProductSnapshot,
  recordPhase,
  releasePages,
  reviewDefsRun,
  statusIntents,
  writeReleaseSnapshot,
  type NrRunPhase,
  type NrStatusPrefix,
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
  let moduleName = '';
  let phase: NrRunPhase = 'effort-read';
  try {
    const invocation = parseNrInvocation(userPrompt || context.message.content || '');
    if (!invocation.ok) return statusMessage(agent, context, invocation.help);
    moduleName = invocation.module;

    const project = currentProjectNumber();
    if (!Number.isSafeInteger(project) || project <= 0) {
      return statusMessage(agent, context, 'The current project is unavailable.');
    }

    phase = 'effort-read';
    const loaded = await readChangeEffort(moduleName);
    if (!loaded.ok) return refuse(agent, context, moduleName, phase, loaded.reason);
    await recordPhase(moduleName, phase, 'ok', 'read');

    phase = 'plan';
    const plan = planNewReleaseL2(loaded.effort, String(agent.agentProject));
    if (!plan.ok) return refuse(agent, context, moduleName, phase, plan.reason);
    await recordPhase(moduleName, phase, 'ok', `${plan.mode} ${plan.pages.join(',')}`);

    if (plan.mode === 'materialize') {
      phase = 'steps';
      const prepared = await prepareMaterialize(project, moduleName, plan.pages, plan.materializeOnly);
      if (!prepared.ok) return refuse(agent, context, moduleName, phase, prepared.message);
      await recordPhase(moduleName, phase, 'ok', `${prepared.steps.length} steps`);
      const steps = prepared.steps.map(step => addStepIntent(context, step));
      return [openMessage(agent, context, moduleName, project, {}), ...steps];
    }

    phase = 'marks';
    const marked = markedPageIds(await readPoolEffort(moduleName));
    const differ = marksDifferMessage(marked, plan.pages);
    if (differ) return refuse(agent, context, moduleName, phase, differ);
    await recordPhase(moduleName, phase, 'ok', 'match');

    phase = 'snapshot';
    await writeReleaseSnapshot(moduleName, await readProductSnapshot(moduleName));
    await recordPhase(moduleName, phase, 'ok', 'written');

    phase = 'steps';
    const built = buildRegenerateSteps(project, moduleName);
    await recordPhase(moduleName, phase, 'ok', `${built.length} steps`);
    const steps = built.map(step => addStepIntent(context, step));
    return [openMessage(agent, context, moduleName, project, {
      nrPages: plan.pages.join(','),
      nrMaterializeOnly: plan.materializeOnly.join(','),
    }), ...steps];
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : String(error);
    let note = message;
    if (moduleName) {
      try {
        await recordPhase(moduleName, phase, 'failed', message);
      } catch (writeError) {
        const extra = writeError instanceof Error && writeError.message ? writeError.message : String(writeError);
        note = `${message}; run log: ${extra}`;
      }
    }
    return statusMessage(agent, context, note, 'failed');
  }
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
  const notice = closeNotice(outcome.message, deletedPaths(step.prompt || ''));
  return [updateStatus(context, parentStep, step, hookSequential, outcome.status, notice)];
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
  if (!review.addMaterialize) {
    return [updateStatus(context, parentStep, step, hookSequential, review.status, review.message)];
  }
  const project = currentProjectNumber();
  const prepared = await prepareMaterialize(project, moduleName, pages, materializeOnly);
  if (!prepared.ok) {
    return [updateStatus(context, parentStep, step, hookSequential, 'failed', prepared.message)];
  }
  const status = updateStatus(context, parentStep, step, hookSequential, review.status, review.message);
  const added = prepared.steps.map(item => addStepIntent(context, item));
  return [status, ...added];
}

function currentStorFiles(): mls.stor.IFileInfo[] {
  return Object.values(mls.stor.files).filter((file): file is mls.stor.IFileInfo => !!file);
}

/** Deletes the generated files of the effort pages, then builds the whole-module materializer. */
async function prepareMaterialize(
  project: number,
  moduleName: string,
  pages: readonly string[],
  materializeOnly: readonly string[],
): Promise<{ ok: true; steps: mls.msg.AIAgentStep[] } | { ok: false; message: string }> {
  const removed = await deleteGeneratedFiles(moduleName, releasePages(pages, materializeOnly), currentStorFiles(), deleteFile);
  if (!removed.ok) return removed;
  return { ok: true, steps: buildApplySteps(project, moduleName, removed.paths) };
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
  kind?: NrStatusPrefix,
): mls.msg.AgentIntent[] {
  return statusIntents(agent.agentName, context.message.threadId, context.message.content, message, kind);
}

async function refuse(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  moduleName: string,
  phase: NrRunPhase,
  message: string,
): Promise<mls.msg.AgentIntent[]> {
  await recordPhase(moduleName, phase, 'refused', message);
  return statusMessage(agent, context, message, 'refused');
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
