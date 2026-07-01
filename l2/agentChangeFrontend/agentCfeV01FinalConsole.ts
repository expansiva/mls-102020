/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01FinalConsole.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01FinalConsole',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 final console barrier after page child tests',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, _args?: string): Promise<mls.msg.AgentIntent[]> {
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
