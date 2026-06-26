/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01ScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  CfeV01PageCandidate,
  CfeV01StepArgs,
  createAddStepIntent,
  createAgentStepPayload,
  createUpdateStatusIntent,
  logPrefix,
  pagePlanId,
  phasePlanId,
  readCreateScanResult,
} from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01ScanL4',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 deterministic L4 scanner for agentChangeFrontend',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const scan = await readCreateScanResult();
    const pendingOwners = scan.workflows.filter(owner => owner.statusFrontend === 'toCreate').length
      + scan.operations.filter(owner => owner.statusFrontend === 'toCreate').length;
    console.log(`${logPrefix(agent)} scan project=${scan.project} modules=${scan.moduleNames.join(',') || '(none)'} pendingOwners=${pendingOwners} candidatePages=${scan.pages.length}`);

    if (scan.pages.length === 0) {
      console.log(`${logPrefix(agent)} no pages to create: no l4 owner with statusFrontend=toCreate`);
      const finalStep = createFinalStep({
        scan: { project: scan.project, moduleNames: scan.moduleNames, pageCount: 0, ownerCount: pendingOwners },
        phase: 'final',
      }, ['v01-scan-l4']);
      return [
        createAddStepIntent(context, parentStep, finalStep),
        createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'No pages to create.'),
      ];
    }

    const intents: mls.msg.AgentIntent[] = scan.pages.map(page => createAddStepIntent(context, parentStep, createPageContainer(page)));
    intents.push(createAddStepIntent(context, parentStep, createFinalStep({
      scan: { project: scan.project, moduleNames: scan.moduleNames, pageCount: scan.pages.length, ownerCount: pendingOwners },
      phase: 'final',
    }, scan.pages.map(page => phasePlanId('config', page)))));
    intents.push(createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Queued ${scan.pages.length} page console test(s).`));
    return intents;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${logPrefix(agent)} failed: ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function createPageContainer(page: CfeV01PageCandidate): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    pagePlanId(page),
    'agentCfeV01PageConsole',
    `v0.1 pagina ${page.pageId}`,
    { page, phase: 'page' },
    ['v01-scan-l4'],
    'parallel_static',
    [
      createChildStep(page, 'contract', ['v01-scan-l4']),
      createChildStep(page, 'shared', [phasePlanId('contract', page)]),
      createChildStep(page, 'layout', [phasePlanId('shared', page)]),
      createChildStep(page, 'config', [phasePlanId('layout', page)]),
    ],
    'waiting_dependency',
  );
}

function createChildStep(page: CfeV01PageCandidate, phase: NonNullable<CfeV01StepArgs['phase']>, dependsOn: string[]): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    phasePlanId(phase, page),
    'agentCfeV01PageChildConsole',
    `v0.1 ${phase} ${page.pageId}`,
    { page, phase },
    dependsOn,
    'sequential',
  );
}

function createFinalStep(args: CfeV01StepArgs, dependsOn: string[]): mls.msg.AIAgentStep {
  return createAgentStepPayload(
    'v01-final-console',
    'agentCfeV01FinalConsole',
    'v0.1 resumo do teste',
    args,
    dependsOn,
    'sequential',
  );
}
