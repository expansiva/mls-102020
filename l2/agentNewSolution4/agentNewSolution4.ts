/// <mls fileReference="_102020_/l2/agentNewSolution4/agentNewSolution4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  buildNs4PlannedSteps,
  createNs4E2Step,
  createNs4E3Step,
  isNs4ModuleToken,
  normalizeNs4RootPlan,
  Ns4RootPlan,
  parseNs4Invocation,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4FileExists,
  ns4ModuleFile,
  readNs4AgentText,
  readNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  afterNs4E1PromptStep,
  beforeNs4E1ClarificationStep,
  beforeNs4E1PromptStep,
  loadNs4StatusPrompt,
} from '/_102020_/l2/agentNewSolution4/steps/e1/agentNs4E1.js';
import {
  afterNs4E2PromptStep,
  beforeNs4E2ClarificationStep,
  beforeNs4E2PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e2/agentNs4E2.js';
import {
  afterNs4E3PromptStep,
  beforeNs4E3ClarificationStep,
  beforeNs4E3PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e3/agentNs4E3.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution4',
    agentProject: 102020,
    agentFolder: 'agentNewSolution4',
    agentDescription: 'L4 v4 product compiler — localized roadmap and permanent business contracts',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
  };
}

export const NS4_AGENT_BUILD = 'build-8 (2026-08-05) iterative E3 access matrix';

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNs4Invocation(userPrompt || '');
  if (!invocation.prompt) {
    return [await statusTask(agent, context, 'Informe o nome ou a descrição do módulo após @@newSolution4.', 'new Solution 4', true)];
  }

  let sourcePrompt = invocation.prompt;
  let resumeModule = '';
  let resumeTarget = '';
  let resumeRound = '';
  let taskTitle = 'new Solution 4';
  if (isNs4ModuleToken(invocation.prompt) && listNs4ModuleFolders().has(invocation.prompt)) {
    const pipeline = await readNs4Pipeline(invocation.prompt);
    const action = resolveNs4ExistingAction(true, pipeline, ns4FileExists(ns4ModuleFile(invocation.prompt)));
    if (action === 'collision') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}" já existe, mas não possui pipeline do agentNewSolution4. Nada foi alterado.`,
        `plan ${invocation.prompt}`,
        true,
      )];
    }
    if (action === 'resume-next' && pipeline?.steps.e3?.status === 'approved') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}": E1, E2 e E3 já estão aprovados. O próximo passo é e4-ontology, ainda não implementado.`,
        `plan ${invocation.prompt}`,
      )];
    }
    resumeModule = invocation.prompt;
    resumeTarget = action === 'resume-e1' ? 'e1' : action === 'resume-e3' ? 'e3' : 'e2';
    resumeRound = resumeTarget === 'e3'
      ? String(Math.max(1, pipeline?.steps.e3?.reviewRound || 1))
      : resumeTarget === 'e2' ? String(Math.max(1, pipeline?.steps.e2?.reviewRound || 1)) : '';
    sourcePrompt = pipeline?.sourcePrompt || invocation.prompt;
    taskTitle = `plan ${invocation.prompt}`;
  }

  const planPrompt = await readNs4AgentText('', 'promptPlan');
  return [{
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: planPrompt },
        { type: 'human', content: sourcePrompt },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4',
        flowName: 'agentNewSolution4',
        sourcePrompt,
        ...(invocation.fast ? { fastMode: 'true' } : {}),
        ...(resumeModule ? { resumeModule } : {}),
        ...(resumeTarget ? { resumeTarget } : {}),
        ...(resumeRound ? { resumeRound } : {}),
      },
    },
  } as mls.msg.AgentIntentAddMessageAI];
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const planId = step.planning?.planId || '';
  if (planId === 'e1-clarification' || planId === 'e1-compile') {
    return beforeNs4E1PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e2-journeys-round-')) {
    return beforeNs4E2PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e3-access-matrix-round-')) {
    return beforeNs4E3PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  return [rootStatus(context, parentStep, step, hookSequential, 'failed', `Unsupported implemented step: ${planId || '(missing)'}`)];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  const planId = step.planning?.planId || '';
  if (planId === 'e1-clarification') {
    return afterNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e2-journeys-round-')) {
    return afterNs4E2PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e3-access-matrix-round-')) {
    return afterNs4E3PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (memoryString(context, 'statusOnly') === 'true') {
    const failed = memoryString(context, 'statusOutcome') === 'error';
    return [rootStatus(context, parentStep, step, hookSequential, failed ? 'failed' : 'completed', 'Status task completed.')];
  }
  try {
    const plan = getNs4RootPlan(context, step);
    if (!plan.validPrompt) {
      return [rootStatus(context, parentStep, step, hookSequential, 'failed', plan.invalidReason || 'Invalid or insufficient business prompt.')];
    }
    const resumeModule = memoryString(context, 'resumeModule');
    const resumeTarget = memoryString(context, 'resumeTarget');
    const planned = resumeModule && (resumeTarget === 'e2' || resumeTarget === 'e3')
      ? buildNs4ResumeSteps(plan, resumeModule, resumeTarget, normalizeResumeRound(memoryString(context, 'resumeRound')))
      : buildNs4PlannedSteps(plan);
    return planned.map(plannedStep => ({
      type: 'add-step',
      messageId: context.message.orderAt,
      threadId: context.message.threadId,
      taskId: context.task?.PK || '',
      parentStepId: step.stepId,
      step: plannedStep,
    } as mls.msg.AgentIntentAddStep));
  } catch (error) {
    return [rootStatus(context, parentStep, step, hookSequential, 'failed', errorMessage(error))];
  }
}

async function beforeClarificationStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIClarificationStep,
  hookSequential: number,
  json: unknown,
): Promise<HTMLElement> {
  const parsed = parseHookJson(json);
  if (parsed?.planId === 'e2-review') {
    return beforeNs4E2ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  if (parsed?.planId === 'e3-access-review') {
    return beforeNs4E3ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  return beforeNs4E1ClarificationStep(agent, context, parentStep, step, hookSequential, json);
}

export function getNs4RootPlan(context: mls.msg.ExecutionContext, rootHint?: mls.msg.AIAgentStep): Ns4RootPlan {
  const root = rootHint || context.task?.iaCompressed?.nextSteps?.[0] as mls.msg.AIAgentStep | undefined;
  return normalizeNs4RootPlan(root?.interaction?.payload?.[0], memoryString(context, 'sourcePrompt'));
}

function buildNs4ResumeSteps(plan: Ns4RootPlan, moduleName: string, target: 'e2' | 'e3', reviewRound: number): mls.msg.AIAgentStep[] {
  const all = buildNs4PlannedSteps(plan);
  if (target === 'e3') {
    return [
      createNs4E3Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e3-access-matrix']),
      ...all.slice(4),
    ];
  }
  return [
    createNs4E2Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e2-journeys']),
    ...all.slice(3),
  ];
}

function normalizeResumeRound(value: string): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function rootStatus(
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIPayload,
  step: mls.msg.AIPayload,
  hookSequential: number,
  status: mls.msg.AIStepStatus,
  traceMsg: string,
): mls.msg.AgentIntentUpdateStatus {
  return {
    type: 'update-status', hookSequential, messageId: context.message.orderAt,
    threadId: context.message.threadId, taskId: context.task?.PK || '', parentStepId: parentStep.stepId,
    stepId: step.stepId, status, traceMsg,
  };
}

function parseHookJson(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

async function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  taskTitle = 'new Solution 4',
  isError = false,
): Promise<mls.msg.AgentIntentAddMessageAI> {
  return {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: await loadNs4StatusPrompt(message) },
        { type: 'human', content: message },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4', flowName: 'agentNewSolution4', statusOnly: 'true',
        statusOutcome: isError ? 'error' : 'info',
      },
    },
  };
}

function memoryString(context: mls.msg.ExecutionContext, key: string): string {
  const value = context.task?.iaCompressed?.longMemory?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
