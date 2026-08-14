/// <mls fileReference="_102020_/l2/agentNewSolution4/agentNewSolution4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  buildNs4PlannedSteps,
  createNs4E2Step,
  createNs4E3Step,
  createNs4E4Step,
  createNs4E5Step,
  createNs4E6Step,
  createNs4E7Step,
  createNs4E8Step,
  createNs4E9Step,
  createNs4E10Step,
  isNs4Pipeline,
  markNs4E3Approved,
  markNs4E4Approved,
  markNs4E5Approved,
  markNs4E6Approved,
  markNs4E7Approved,
  markNs4E9Approved,
  markNs4E10Approved,
  normalizeNs4RootPlan,
  Ns4RootPlan,
  parseNs4Invocation,
  resolveNs4DynamicWorkerRequest,
  resolveNs4ExistingAction,
  resolveNs4ExistingModuleToken,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4AccessMatrixFile,
  ns4FileExists,
  ns4ModuleFile,
  ns4OntologyIndexFile,
  ns4RulesFile,
  ns4CompositionFile,
  ns4UseCaseIndexFile,
  ns4NavigationIndexFile,
  ns4ProcessFile,
  readNs4AgentText,
  readNs4Module,
  readNs4Pipeline,
  writeNs4Pipeline,
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
import {
  afterNs4E4PromptStep,
  beforeNs4E4ClarificationStep,
  beforeNs4E4PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e4/agentNs4E4.js';
import {
  afterNs4E5PromptStep,
  beforeNs4E5ClarificationStep,
  beforeNs4E5PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e5/agentNs4E5.js';
import {
  afterNs4E6PromptStep,
  beforeNs4E6ClarificationStep,
  beforeNs4E6PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e6/agentNs4E6.js';
import {
  afterNs4E7PromptStep,
  beforeNs4E7ClarificationStep,
  beforeNs4E7PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e7/agentNs4E7.js';
import {
  afterNs4E8PromptStep,
  beforeNs4E8PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e8/agentNs4E8.js';
import { isNs4E8PresentationRepairPlanId } from '/_102020_/l2/agentNewSolution4/steps/e8/dispatch.js';
import {
  afterNs4E9PromptStep,
  beforeNs4E9PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e9/agentNs4E9.js';
import {
  afterNs4E10PromptStep,
  beforeNs4E10PromptStep,
} from '/_102020_/l2/agentNewSolution4/steps/e10/agentNs4E10.js';

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

export const NS4_AGENT_BUILD = 'build-56 (2026-08-13) bounded E8 selection-source repair';

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNs4Invocation(userPrompt || '');
  if (!invocation.prompt) {
    // error, i18n
    return [await statusTask(agent, context, 'Informe o nome ou a descrição do módulo após @@newSolution4.', 'new Solution 4', true)];
  }

  let sourcePrompt = invocation.prompt;
  let resumeModule = '';
  let resumeTarget = '';
  let resumeRound = '';
  let taskTitle = 'new Solution 4';
  const existingModule = resolveNs4ExistingModuleToken(invocation.prompt, listNs4ModuleFolders());
  if (existingModule) {
    let pipeline = await readNs4Pipeline(existingModule);
    if (isNs4Pipeline(pipeline)) {
      const moduleArtifact = await readNs4Module(existingModule);
      const approvedE3 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e3-access-matrix' && completed.status === 'approved');
      const approvedE4 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e4-ontology' && completed.status === 'approved');
      const approvedE5 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e5-rules' && completed.status === 'approved');
      const approvedE6 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e6-behaviors' && completed.status === 'approved');
      const approvedE7 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e7-realization' && completed.status === 'approved');
      const approvedE9 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e9-navigation-compiler' && completed.status === 'approved');
      const approvedE10 = moduleArtifact?.specStatus.completedSteps
        .find(completed => completed.stepId === 'e10-validation' && completed.status === 'approved');
      if (pipeline.steps.e3?.status !== 'approved' && approvedE3 && ns4FileExists(ns4AccessMatrixFile(existingModule))) {
        pipeline = markNs4E3Approved(
          pipeline,
          approvedE3.approvedBy,
          `l4/${existingModule}/access/access-matrix.defs.ts`,
          approvedE3.approvedAt,
        );
      }
      if (pipeline.steps.e4?.status !== 'approved' && approvedE4 && ns4FileExists(ns4OntologyIndexFile(existingModule))) {
        pipeline = markNs4E4Approved(
          pipeline,
          approvedE4.approvedBy,
          [`l4/${existingModule}/ontology/index.defs.ts`],
          approvedE4.approvedAt,
        );
      }
      if (pipeline.steps.e5?.status !== 'approved' && approvedE5 && ns4FileExists(ns4RulesFile(existingModule))) {
        pipeline = markNs4E5Approved(
          pipeline,
          approvedE5.approvedBy,
          [`l4/${existingModule}/rules/rules.defs.ts`],
          approvedE5.approvedAt,
        );
      }
      if (pipeline.steps.e6?.status !== 'approved' && approvedE6 && ns4FileExists(ns4CompositionFile(existingModule))) {
        pipeline = markNs4E6Approved(
          pipeline,
          approvedE6.approvedBy,
          [`l4/${existingModule}/composition/additional-capabilities.defs.ts`],
          approvedE6.approvedAt,
        );
      }
      if (pipeline.steps.e7?.status !== 'approved' && approvedE7 && ns4FileExists(ns4UseCaseIndexFile(existingModule))) {
        pipeline = markNs4E7Approved(
          pipeline,
          [`l4/${existingModule}/usecases/index.defs.ts`],
          approvedE7.approvedAt,
        );
      }
      if (pipeline.steps.e9?.status !== 'approved' && approvedE9 && ns4FileExists(ns4NavigationIndexFile(existingModule))) {
        pipeline = markNs4E9Approved(pipeline, [`l4/${existingModule}/navigation/index.defs.ts`], approvedE9.approvedAt);
      }
      if (pipeline.steps.e10?.status !== 'approved' && approvedE10 && ns4FileExists(ns4ProcessFile(existingModule))) {
        pipeline = markNs4E10Approved(pipeline, approvedE10.approvedBy, approvedE10.approvedAt);
      }
      await writeNs4Pipeline(pipeline);
    }
    const action = resolveNs4ExistingAction(true, pipeline, ns4FileExists(ns4ModuleFile(existingModule)));
    if (action === 'collision') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${existingModule}" já existe, mas não possui pipeline do agentNewSolution4. Nada foi alterado.`,
        `plan ${existingModule}`,
        true,
      )];
    }
    if (action === 'resume-next' && pipeline?.steps.e10?.status === 'approved') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${existingModule}": especificação completa aprovada e pipeline encerrado.`,
        `plan ${existingModule}`,
      )];
    }
    resumeModule = existingModule;
    resumeTarget = action === 'resume-e1' ? 'e1' : action === 'resume-e10' ? 'e10' : action === 'resume-e9' ? 'e9' : action === 'resume-e8' ? 'e8' : action === 'resume-e7' ? 'e7' : action === 'resume-e6' ? 'e6' : action === 'resume-e5' ? 'e5' : action === 'resume-e4' ? 'e4' : action === 'resume-e3' ? 'e3' : 'e2';
    resumeRound = resumeTarget === 'e7' ? '' : resumeTarget === 'e8' ? String(Math.max(1, pipeline?.steps.e8?.reviewRound || 1)) : resumeTarget === 'e6'
      ? String(Math.max(1, pipeline?.steps.e6?.reviewRound || 1))
      : resumeTarget === 'e5'
      ? String(Math.max(1, pipeline?.steps.e5?.reviewRound || 1))
      : resumeTarget === 'e4'
      ? String(Math.max(1, pipeline?.steps.e4?.reviewRound || 1))
      : resumeTarget === 'e3'
      ? String(Math.max(1, pipeline?.steps.e3?.reviewRound || 1))
      : resumeTarget === 'e2' ? String(Math.max(1, pipeline?.steps.e2?.reviewRound || 1)) : '';
    sourcePrompt = pipeline?.sourcePrompt || invocation.prompt;
    taskTitle = `plan ${existingModule}`;
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
  const dynamic = resolveNs4DynamicWorkerRequest(args, step.prompt);
  if (dynamic.worker === 'e4') return beforeNs4E4PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  if (dynamic.worker === 'e7') return beforeNs4E7PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  if (dynamic.worker === 'e8') return beforeNs4E8PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  const planId = step.planning?.planId || '';
  if (planId === 'e1-clarification' || planId.startsWith('e1-clarification-round-') || planId === 'e1-compile') {
    return beforeNs4E1PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e2-journeys-round-')) {
    return beforeNs4E2PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e3-access-matrix-round-')) {
    return beforeNs4E3PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e4-ontology-round-')) {
    return beforeNs4E4PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e5-rules-round-')) {
    return beforeNs4E5PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e6-behaviors-round-')) {
    return beforeNs4E6PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId === 'e7-realization' || planId.startsWith('e7-realization-finalize-')) {
    return beforeNs4E7PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e8-workspaces-round-') || planId.startsWith('e8-workspaces-finalize-') || isNs4E8PresentationRepairPlanId(planId)) {
    return beforeNs4E8PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId === 'e9-navigation-compiler') return beforeNs4E9PromptStep(agent, context, parentStep, step, hookSequential, args);
  if (planId === 'e10-validation') return beforeNs4E10PromptStep(agent, context, parentStep, step, hookSequential, args);
  return [rootStatus(context, parentStep, step, hookSequential, 'failed', `Unsupported implemented step: ${planId || '(missing)'}`)];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const dynamic = resolveNs4DynamicWorkerRequest(args, step.prompt);
  if (dynamic.worker === 'e4') return afterNs4E4PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  if (dynamic.worker === 'e7') return afterNs4E7PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  if (dynamic.worker === 'e8') return afterNs4E8PromptStep(agent, context, parentStep, step, hookSequential, dynamic.args);
  const planId = step.planning?.planId || '';
  if (planId === 'e1-clarification' || planId.startsWith('e1-clarification-round-')) {
    return afterNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e2-journeys-round-')) {
    return afterNs4E2PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e3-access-matrix-round-')) {
    return afterNs4E3PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e4-ontology-round-')) {
    return afterNs4E4PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e5-rules-round-')) {
    return afterNs4E5PromptStep(agent, context, parentStep, step, hookSequential);
  }
  if (planId.startsWith('e6-behaviors-round-')) {
    return afterNs4E6PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId === 'e7-realization' || planId.startsWith('e7-realization-finalize-')) {
    return afterNs4E7PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId.startsWith('e8-workspaces-round-') || planId.startsWith('e8-workspaces-finalize-') || isNs4E8PresentationRepairPlanId(planId)) {
    return afterNs4E8PromptStep(agent, context, parentStep, step, hookSequential, args);
  }
  if (planId === 'e9-navigation-compiler') return afterNs4E9PromptStep(agent, context, parentStep, step, hookSequential);
  if (planId === 'e10-validation') return afterNs4E10PromptStep(agent, context, parentStep, step, hookSequential);
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
    const planned = resumeModule && (resumeTarget === 'e2' || resumeTarget === 'e3' || resumeTarget === 'e4' || resumeTarget === 'e5' || resumeTarget === 'e6' || resumeTarget === 'e7' || resumeTarget === 'e8' || resumeTarget === 'e9' || resumeTarget === 'e10')
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
  if (parsed?.planId === 'e4-ontology-review') {
    return beforeNs4E4ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  if (parsed?.planId === 'e5-rules-review') {
    return beforeNs4E5ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  if (parsed?.planId === 'e6-composition-review') {
    return beforeNs4E6ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  if (parsed?.planId === 'e7-lifecycle-resolution') {
    return beforeNs4E7ClarificationStep(agent, context, parentStep, step, hookSequential, parsed);
  }
  return beforeNs4E1ClarificationStep(agent, context, parentStep, step, hookSequential, json);
}

export function getNs4RootPlan(context: mls.msg.ExecutionContext, rootHint?: mls.msg.AIAgentStep): Ns4RootPlan {
  const root = rootHint || context.task?.iaCompressed?.nextSteps?.[0] as mls.msg.AIAgentStep | undefined;
  return normalizeNs4RootPlan(root?.interaction?.payload?.[0], memoryString(context, 'sourcePrompt'));
}

function buildNs4ResumeSteps(
  plan: Ns4RootPlan,
  moduleName: string,
  target: 'e2' | 'e3' | 'e4' | 'e5' | 'e6' | 'e7' | 'e8' | 'e9' | 'e10',
  reviewRound: number,
): mls.msg.AIAgentStep[] {
  const all = buildNs4PlannedSteps(plan);
  if (target === 'e7') {
    return [
      createNs4E7Step(moduleName, [], plan.presentation.stepTitles['e7-realization']),
      ...all.slice(8),
    ];
  }
  if (target === 'e8') {
    return [
      createNs4E8Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e8-workspaces']),
      ...all.slice(9),
    ];
  }
  if (target === 'e9') {
    return [
      createNs4E9Step(moduleName, [], plan.presentation.stepTitles['e9-navigation-compiler']),
      ...all.slice(10),
    ];
  }
  if (target === 'e10') {
    return [createNs4E10Step(moduleName, [], plan.presentation.stepTitles['e10-validation'])];
  }
  if (target === 'e6') {
    return [
      createNs4E6Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e6-behaviors']),
      ...all.slice(7),
    ];
  }
  if (target === 'e5') {
    return [
      createNs4E5Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e5-rules']),
      ...all.slice(6),
    ];
  }
  if (target === 'e4') {
    return [
      createNs4E4Step(moduleName, reviewRound, '', [], plan.presentation.stepTitles['e4-ontology']),
      ...all.slice(5),
    ];
  }
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
