/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeCreateScanL4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, readCreateContext } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeCreateScanL4',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Scan l4 statusFrontend=toCreate and start create fan-out',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const createContext = await readCreateContext();
    console.log(`[${agent.agentName}] project=${createContext.project} pagesToCreate=${createContext.pages.length}`);
    if (createContext.pages.length === 0) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'No statusFrontend=toCreate owners.')];
    }

    const args = createContext.pages.map(page => JSON.stringify({ pageId: page.pageId }));
    const fanout = createAgentStepPayload(
      'create-page-fanout',
      'agentCfeCreatePage',
      'Criar paginas {{completed}}/{{total}}, falhas {{failed}}',
      { planId: 'create-page-fanout' },
      [],
      'parallel_dynamic',
      'in_progress',
    );
    fanout.interaction = {
      input: [{ type: 'system', content: '<!-- modelType: codefast -->' }],
      cost: 0,
      trace: [`queued ${args.length} page(s) for create`],
      payload: null,
    };

    const materialize = createAgentStepPayload(
      'materialize-create-l2',
      'agentCfeMaterializeL2',
      'Materializar frontend L2',
      { planId: 'materialize-create-l2', force: true },
      ['create-page-fanout'],
    );
    return [
      createAddStepIntent(context, parentStep, fanout, args),
      createAddStepIntent(context, parentStep, materialize),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `Queued ${args.length} page(s).`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
