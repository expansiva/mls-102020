/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeCreateFinalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, finalizeGeneratedPages } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateFinalize',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Mark created frontend owners done after materialization and frontend registration',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const result = await finalizeGeneratedPages();
    const trace = `pagesDone=${result.pagesDone.length}; ownersDone=${result.ownersDone.length}; skippedPages=${result.skippedPages.length}`;
    console.log(`[${agent.agentName}] ${trace}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
