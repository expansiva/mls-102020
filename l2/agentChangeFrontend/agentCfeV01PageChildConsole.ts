/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01PageChildConsole.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, logPrefix, parseStepArgs } from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01PageChildConsole',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 child console test for contract/shared/layout/config phases',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseStepArgs(args || step.prompt);
  const page = parsed.page;
  const phase = parsed.phase || 'page';
  if (!page) return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', 'missing page args')];
  console.log(`${logPrefix(agent)} phase=${phase} page=${page.pageId} module=${page.moduleName}`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
