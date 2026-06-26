/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01PageConsole.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, logPrefix, parseStepArgs } from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

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
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
