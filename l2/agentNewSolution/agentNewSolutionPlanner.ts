/// <mls fileReference="_102020_/l2/agentNewSolution/agentNewSolutionPlanner.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { hydrateNewSolutionOutputs } from '/_102020_/l2/agentNewSolution/agentPlanningShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolutionPlanner',
    agentProject: 102020,
    agentFolder: 'agentNewSolution',
    agentDescription: 'Planner group wrapper for new solution planning',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  await hydrateNewSolutionOutputs(context); // F-06: outputs/ cache for cleaned payloads
  if (!agent || !context || !parentStep || !step) throw new Error('[agentNewSolutionPlanner](beforePromptStep) invalid params');
  if (!context.task) throw new Error('[agentNewSolutionPlanner](beforePromptStep) task invalid');

  const updateStatus: mls.msg.AgentIntentUpdateStatus = {
    type: 'update-status',
    hookSequential,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task.PK,
    parentStepId: parentStep.stepId,
    stepId: step.stepId,
    status: 'completed',
  };

  return [updateStatus];
}
