/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/finalize90/agentM3Finalize.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { updateM3Status } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Intents.js';
import { parseM3StepInvocation } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { executeM3Finalize, productionFinalizePort } from '/_102020_/l2/agentMaterializeL2v3/steps/finalize90/run.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentM3Finalize', agentProject: 102020, agentFolder: 'agentMaterializeL2v3/steps/finalize90',
    agentDescription: 'Recompile the generated files of a materialize run, check receipts and write summary.json', visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM3StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const result = await executeM3Finalize(productionFinalizePort(invocation), invocation);
  return [updateM3Status(context, parentStep, step, hookSequential, result.status, result.status === 'completed' ? result.summary : result.reason)];
}
