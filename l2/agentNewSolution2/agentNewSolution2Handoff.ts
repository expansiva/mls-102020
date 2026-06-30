/// <mls fileReference="_102020_/l2/agentNewSolution2/agentNewSolution2Handoff.ts" enhancement="_102027_/l2/enhancementAgent"/>

// No-LLM container for the handoff phase. Identical pattern to agentNewSolution2Domain/Behavior:
// completing it opens its children (behavior-validate -> final-resume). Kept SEPARATE from
// agentNewSolution2Final so that only the final-resume step exposes openStepView — otherwise the
// "open summary" link would appear on both the container and the resume step.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentNewSolution2/ns2Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution2Handoff',
    agentProject: 102020,
    agentFolder: 'agentNewSolution2',
    agentDescription: 'Container for the handoff phase (validate + finish)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error('[agentNewSolution2Handoff] task invalid');
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
