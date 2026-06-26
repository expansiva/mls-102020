/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeCreatePage.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, generatePageDefs, parseCreatePageArgs, readCreateContext } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreatePage',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Create contract/shared/page defs for one frontend page',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const { pageId } = parseCreatePageArgs(args || step.prompt);
    const createContext = await readCreateContext();
    const page = createContext.pages.find(item => item.pageId === pageId);
    if (!page) throw new Error(`page not found for create: ${pageId}`);
    await generatePageDefs(page);
    console.log(`[${agent.agentName}] created defs for ${page.moduleName}/${page.pageId}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
