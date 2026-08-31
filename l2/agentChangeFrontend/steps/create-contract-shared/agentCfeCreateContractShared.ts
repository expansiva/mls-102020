/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-contract-shared/agentCfeCreateContractShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, parseCreatePageArgs, prepareCreateRunPage, saveBaseSharedDefs, saveContractDefs, savePageTestsFile } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { recordCfeDegradation } from '/_102020_/l2/agentChangeFrontend/helpers/cfePipelineTrace.js';

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
    const { moduleName, pageId, runId } = parseArgs(args || step.prompt);
    const prepared = await prepareCreateRunPage(runId, pageId, moduleName);
    await saveContractDefs(prepared);
    await saveBaseSharedDefs(prepared);
    // runId lets the page tests see the whole module's reads (the runner's <seedRef> pool is per run).
    await savePageTestsFile(prepared, runId);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    const failed = peekPageArgs(args || step.prompt);
    await recordCfeDegradation(failed.moduleName, 'create-contract-shared-failed', message, failed.pageId || undefined);
    // Fan-out children stay completed-with-trace: a 'failed' slot fails the whole task. The
    // run summary reads the degradation and names this item; it does not look like success.
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `CREATE-CONTRACT-SHARED-FAILED: ${message}`)];
  }
}

function parseArgs(value: string | undefined): { moduleName: string; pageId: string; runId: string } {
  const { moduleName, pageId } = parseCreatePageArgs(value);
  const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
  const runId = typeof parsed.runId === 'string' ? parsed.runId : '';
  if (!runId) throw new Error('missing create execution runId');
  return { moduleName, pageId, runId };
}

function peekPageArgs(value: string | undefined): { moduleName: string; pageId: string } {
  try {
    const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
    return {
      moduleName: typeof parsed.moduleName === 'string' ? parsed.moduleName.trim() : '',
      pageId: typeof parsed.pageId === 'string' ? parsed.pageId.trim() : '',
    };
  } catch {
    return { moduleName: '', pageId: '' };
  }
}
