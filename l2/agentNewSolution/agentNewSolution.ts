/// <mls fileReference="_102020_/l2/agentNewSolution/agentNewSolution.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readAgentProvenance, describeProvenance } from '/_102020_/l2/agentNewSolution/helpers/ns4BuildStamp.js';
import {
  buildNs4PlannedSteps,
  clearNs4ModuleCompletedStepsFrom,
  createNs4E2Step,
  createNs4E3Step,
  createNs4E4Step,
  createNs4E5Step,
  createNs4E6Step,
  createNs4E7Step,
  createNs4E8Step,
  createNs4E9Step,
  createNs4E10Step,
  detectNs4RebuildIntentModule,
  isNs4Pipeline,
  markNs4E3Approved,
  markNs4E4Approved,
  markNs4E5Approved,
  markNs4E6Approved,
  markNs4E7Approved,
  markNs4E9Approved,
  resolveNs4StepOwner,
  markNs4E10Approved,
  normalizeNs4RootPlan,
  Ns4RootPlan,
  parseNs4Invocation,
  resolveNs4DynamicWorkerRequest,
  resetNs4PipelineForRebuild,
  resolveNs4ExistingAction,
  resolveNs4ExistingModuleToken,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4AccessMatrixFile,
  ns4FileExists,
  archiveNs4ModuleForRebuild,
  ns4ModuleFile,
  ns4OntologyIndexFile,
  ns4RulesFile,
  ns4CompositionFile,
  ns4UseCaseIndexFile,
  ns4ProcessFile, ns4SiteMapFile,
  readNs4AgentText,
  readNs4Module,
  readNs4Pipeline,
  writeNs4Module,
  writeNs4Pipeline,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Fs.js';
import {
  afterNs4E1PromptStep,
  beforeNs4E1ClarificationStep,
  beforeNs4E1PromptStep,
  loadNs4StatusPrompt,
} from '/_102020_/l2/agentNewSolution/steps/e1/agentNs4E1.js';
import {
  afterNs4E2PromptStep,
  beforeNs4E2ClarificationStep,
  beforeNs4E2PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e2/agentNs4E2.js';
import {
  afterNs4E3PromptStep,
  beforeNs4E3ClarificationStep,
  beforeNs4E3PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e3/agentNs4E3.js';
import {
  afterNs4E4PromptStep,
  beforeNs4E4ClarificationStep,
  beforeNs4E4PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e4/agentNs4E4.js';
import {
  afterNs4E5PromptStep,
  beforeNs4E5ClarificationStep,
  beforeNs4E5PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e5/agentNs4E5.js';
import {
  afterNs4E6PromptStep,
  beforeNs4E6ClarificationStep,
  beforeNs4E6PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e6/agentNs4E6.js';
import {
  afterNs4E7PromptStep,
  beforeNs4E7ClarificationStep,
  beforeNs4E7PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e7/agentNs4E7.js';
import {
  afterNs4E8PromptStep,
  beforeNs4E8PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e8/agentNs4E8.js';
import {
  afterNs4E9PromptStep,
  beforeNs4E9PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e9/agentNs4E9.js';
import {
  afterNs4E10PromptStep,
  beforeNs4E10PromptStep,
} from '/_102020_/l2/agentNewSolution/steps/e10/agentNs4E10.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'L4 v4 product compiler — localized roadmap and permanent business contracts',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
    beforeClarificationStep,
  };
}

export const NS4_AGENT_BUILD = 'build-59 (2026-08-15) tier workspace model, classic L4 emission and one dispatch table';

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  // WHICH VERSION of this agent is about to run, as an identity a human matches with git (see
  // ns4BuildStamp). Informational: a source edited locally is normal, and work never pushed is
  // invisible to the platform — so there is nothing here to warn about, only something to record.
  const provenance = describeProvenance(await readAgentProvenance());
  const invocation = parseNs4Invocation(userPrompt || '');
  if (!invocation.prompt) {
    // error, i18n
    return [await statusTask(agent, context, 'Informe o nome ou a descrição do módulo após @@newSolution.', 'new Solution', true)];
  }

  let sourcePrompt = invocation.prompt;
  let resumeModule = '';
  let resumeTarget = '';
  let resumeRound = '';
  let rebuildModule = '';
  let rebuildNote = '';
  let taskTitle = 'new Solution';
  const existingModules = listNs4ModuleFolders();
  const existingModule = resolveNs4ExistingModuleToken(invocation.prompt, existingModules);

  if (invocation.rebuild && !existingModule) {
    // Never create silently from a rebuild intent: the user believes the module is there.
    const intended = detectNs4RebuildIntentModule(invocation.prompt, existingModules);
    return [await statusTask(
      agent,
      context,
      intended
        ? `Para regenerar, informe apenas o módulo: "@@newSolution ${intended} /rebuild${invocation.rebuildFrom ? ` ${invocation.rebuildFrom}` : ''}".`
        : `Não existe módulo com esse nome para regenerar. Use "@@newSolution <módulo> /rebuild" com o nome de um módulo já gerado.`,
      'new Solution',
      true,
    )];
  }

  if (!existingModule && !invocation.rebuild) {
    // The prompt ASKS for a rebuild in prose and names a module that exists: teach the flag instead of
    // reading it as a new module and dying in the E1 existence backstop (the msgtask3 incident).
    const intended = detectNs4RebuildIntentModule(invocation.prompt, existingModules);
    if (intended) {
      return [await statusTask(
        agent,
        context,
        `Módulo "${intended}" já existe. Para regenerar, use "@@newSolution ${intended} /rebuild" (tudo) ou "@@newSolution ${intended} /rebuild e10" (a partir de um step). Nada foi alterado.`,
        `plan ${intended}`,
        true,
      )];
    }
  }

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
          undefined,
          approvedE3.autoReason,
        );
      }
      if (pipeline.steps.e4?.status !== 'approved' && approvedE4 && ns4FileExists(ns4OntologyIndexFile(existingModule))) {
        pipeline = markNs4E4Approved(
          pipeline,
          approvedE4.approvedBy,
          [`l4/${existingModule}/ontology/index.defs.ts`],
          approvedE4.approvedAt,
          undefined,
          approvedE4.autoReason,
        );
      }
      if (pipeline.steps.e5?.status !== 'approved' && approvedE5 && ns4FileExists(ns4RulesFile(existingModule))) {
        pipeline = markNs4E5Approved(
          pipeline,
          approvedE5.approvedBy,
          [`l4/${existingModule}/rules/rules.defs.ts`],
          approvedE5.approvedAt,
          approvedE5.autoReason,
        );
      }
      if (pipeline.steps.e6?.status !== 'approved' && approvedE6 && ns4FileExists(ns4CompositionFile(existingModule))) {
        pipeline = markNs4E6Approved(
          pipeline,
          approvedE6.approvedBy,
          [`l4/${existingModule}/composition/additional-capabilities.defs.ts`],
          approvedE6.approvedAt,
          approvedE6.autoReason,
        );
      }
      if (pipeline.steps.e7?.status !== 'approved' && approvedE7 && ns4FileExists(ns4UseCaseIndexFile(existingModule))) {
        pipeline = markNs4E7Approved(
          pipeline,
          [`l4/${existingModule}/usecases/index.defs.ts`],
          approvedE7.approvedAt,
        );
      }
      if (pipeline.steps.e9?.status !== 'approved' && approvedE9 && ns4FileExists(ns4SiteMapFile(existingModule))) {
        pipeline = markNs4E9Approved(pipeline, [`l4/${existingModule}/siteMap.defs.ts`], approvedE9.approvedAt);
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
        `Módulo "${existingModule}" já existe, mas não possui pipeline do agentNewSolution. Nada foi alterado.`,
        `plan ${existingModule}`,
        true,
      )];
    }
    if (invocation.rebuild) {
      // Explicit intent, and only for a module this flow owns: `collision` above already refused the rest.
      if (!invocation.rebuildFrom) {
        // TOTAL: archive the module's whole l4/l5 so no draft, trace or per-entity defs from the previous
        // ontology survives into the new generation, then generate again from E1.
        const archived = await archiveNs4ModuleForRebuild(existingModule);
        rebuildNote = `/rebuild ${existingModule}: archived ${archived.length} l4/l5 files`;
        rebuildModule = existingModule;
        sourcePrompt = pipeline?.sourcePrompt || invocation.prompt;
        // A prompt typed alongside the flag replaces the stored one; the bare module name does not.
        if (invocation.prompt && invocation.prompt !== existingModule) sourcePrompt = invocation.prompt;
        taskTitle = `plan ${existingModule}`;
      } else if (!isNs4Pipeline(pipeline)) {
        return [await statusTask(
          agent,
          context,
          `Módulo "${existingModule}" não possui pipeline do agentNewSolution para regenerar a partir de ${invocation.rebuildFrom}.`,
          `plan ${existingModule}`,
          true,
        )];
      } else {
        // PARTIAL: reuse the resume machinery, after resetting eN..e10 EXPLICITLY. The artifact's
        // completedSteps are cleared too, or the reconciliation above would re-approve them on the next
        // invocation and answer "pipeline encerrado" to a second /rebuild.
        const rebuiltAt = new Date().toISOString();
        await writeNs4Pipeline(resetNs4PipelineForRebuild(pipeline, invocation.rebuildFrom, rebuiltAt));
        const moduleArtifact = await readNs4Module(existingModule);
        if (moduleArtifact) {
          await writeNs4Module(existingModule, clearNs4ModuleCompletedStepsFrom(moduleArtifact, invocation.rebuildFrom));
        }
        resumeModule = existingModule;
        resumeTarget = invocation.rebuildFrom;
        resumeRound = '1';
        sourcePrompt = pipeline.sourcePrompt || invocation.prompt;
        taskTitle = `plan ${existingModule}`;
        rebuildNote = `/rebuild ${existingModule} from ${invocation.rebuildFrom} at ${rebuiltAt}`;
      }
    } else if (action === 'resume-next' && pipeline?.steps.e10?.status === 'approved') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${existingModule}": especificação completa aprovada e pipeline encerrado. Para regenerar, use "@@newSolution ${existingModule} /rebuild" (tudo) ou "@@newSolution ${existingModule} /rebuild e10" (a partir de um step).`,
        `plan ${existingModule}`,
      )];
    } else {
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
        taskName: 'newSolution',
        flowName: 'agentNewSolution',
        sourcePrompt,
        ...(invocation.fast ? { fastMode: 'true' } : {}),
        ...(resumeModule ? { resumeModule } : {}),
        ...(rebuildModule ? { rebuildModule } : {}),
        ...(resumeTarget ? { resumeTarget } : {}),
        ...(resumeRound ? { resumeRound } : {}),
        ...(rebuildNote ? { rebuildNote } : {}),
        ...(provenance ? { agentBuild: provenance } : {}),
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
  switch (resolveNs4StepOwner(planId)) {
    case 'e1': return beforeNs4E1PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e2': return beforeNs4E2PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e3': return beforeNs4E3PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e4': return beforeNs4E4PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e5': return beforeNs4E5PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e6': return beforeNs4E6PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e7': return beforeNs4E7PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e8': return beforeNs4E8PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e9': return beforeNs4E9PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e10': return beforeNs4E10PromptStep(agent, context, parentStep, step, hookSequential, args);
    default: break;
  }
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
  // E1's after hook has no compile stage, and only the root falls through to planning.
  switch (planId === 'e1-compile' ? '' : resolveNs4StepOwner(planId)) {
    case 'e1': return afterNs4E1PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e2': return afterNs4E2PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e3': return afterNs4E3PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e4': return afterNs4E4PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e5': return afterNs4E5PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e6': return afterNs4E6PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e7': return afterNs4E7PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e8': return afterNs4E8PromptStep(agent, context, parentStep, step, hookSequential, args);
    case 'e9': return afterNs4E9PromptStep(agent, context, parentStep, step, hookSequential);
    case 'e10': return afterNs4E10PromptStep(agent, context, parentStep, step, hookSequential);
    default: break;
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
  taskTitle = 'new Solution',
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
        taskName: 'newSolution', flowName: 'agentNewSolution', statusOnly: 'true',
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
