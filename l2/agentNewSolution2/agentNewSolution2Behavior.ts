/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Behavior.ts" enhancement="_102027_/l2/enhancementAgent"/>

// No-LLM wrapper for the behavior phase (workflows + operations) — the heart of Stage 1. Completing
// it opens its children (classify -> workflow index/def, operation index/def), which gate on their
// own deps (classification waits for the frozen plan + the per-entity ontology fan-out).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution2Behavior',
    agentProject: 102020,
    agentFolder: 'agentNewSolution2',
    agentDescription: 'Container for the behavior phase (workflows + operations)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution2Behavior] task invalid');
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
