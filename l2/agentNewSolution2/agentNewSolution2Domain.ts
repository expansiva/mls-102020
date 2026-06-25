/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Domain.ts" enhancement="_102027_/l2/enhancementAgent"/>

// No-LLM wrapper for the domain phase (ontology + rules). Completing it opens its children
// (blueprint -> review -> finalize -> entity/mdm/horizontals/plugins), which gate on their own deps.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution2Domain',
    agentProject: 102020,
    agentFolder: 'agentNewSolution2',
    agentDescription: 'Container for the domain phase (ontology + rules)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution2Domain] task invalid');
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
