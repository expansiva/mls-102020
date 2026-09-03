/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/reconcile-shared/agentCfeReconcileShared.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, parseCreatePageArgs, reconcileCreateRunPage } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeReconcileShared',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/reconcile-shared',
    agentDescription: 'Reconcile saved page layout variants into one shared defs artifact',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  try {
    const { moduleName, pageId, runId } = parseCreatePageArgs(args || step.prompt);
    await reconcileCreateRunPage(runId, pageId, moduleName);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `CREATE-SHARED-RECONCILE-FAILED: ${message}`)];
  }
}
