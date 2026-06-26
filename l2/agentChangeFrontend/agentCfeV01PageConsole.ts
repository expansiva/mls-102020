/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01PageConsole.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  CfeV01PageCandidate,
  CfeV01StepArgs,
  createAddStepIntent,
  createAgentStepPayload,
  createUpdateStatusIntent,
  logPrefix,
  parseStepArgs,
  phasePlanId,
} from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01PageConsole',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 page-level console test container',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseStepArgs(args || step.prompt);
  const page = parsed.page;
  if (!page) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', 'missing page args')];
  console.log(`${logPrefix(agent)} page=${page.pageId} module=${page.moduleName} source=${page.sourceKind} owners=${page.ownerIds.join(',')} operations=${page.operationIds.join(',')}`);
  return [
    createAddStepIntent(context, step, createChildStep(page, 'contract', [])),
    createAddStepIntent(context, step, createChildStep(page, 'shared', [phasePlanId('contract', page)])),
    createAddStepIntent(context, step, createChildStep(page, 'layout', [phasePlanId('shared', page)])),
    createAddStepIntent(context, step, createChildStep(page, 'config', [phasePlanId('layout', page)])),
    createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed'),
  ];
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
