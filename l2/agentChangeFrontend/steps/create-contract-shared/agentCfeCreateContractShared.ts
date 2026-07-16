/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-contract-shared/agentCfeCreateContractShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, parseCreatePageArgs, prepareCreateRunPage, saveBaseSharedDefs, saveContractDefs, savePageTestsFile } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateContractShared',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-contract-shared',
    agentDescription: 'Create one page contract and base shared defs without an LLM call',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const { pageId, runId } = parseArgs(args || step.prompt);
    const prepared = await prepareCreateRunPage(runId, pageId);
    await saveContractDefs(prepared);
    await saveBaseSharedDefs(prepared);
    await savePageTestsFile(prepared);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `CREATE-CONTRACT-SHARED-FAILED: ${message}`)];
  }
}

function parseArgs(value: string | undefined): { pageId: string; runId: string } {
  const { pageId } = parseCreatePageArgs(value);
  const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
  const runId = typeof parsed.runId === 'string' ? parsed.runId : '';
  if (!runId) throw new Error('missing create execution runId');
  return { pageId, runId };
}
