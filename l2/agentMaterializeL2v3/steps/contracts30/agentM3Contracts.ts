/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/contracts30/agentM3Contracts.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addM3Step, m3Result, updateM3Status } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Intents.js';
import { parseM3StepInvocation } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { executeM3Contracts, productionContractsPort } from '/_102020_/l2/agentMaterializeL2v3/steps/contracts30/run.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentM3Contracts', agentProject: 102020, agentFolder: 'agentMaterializeL2v3/steps/contracts30',
    agentDescription: 'Generate the typed BFF client of each page contract without an LLM call', visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM3StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const result = await executeM3Contracts(productionContractsPort(invocation), invocation);
  if (result.status === 'failed') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', result.reason)];
  return [
    addM3Step(context, parentStep.stepId, m3Result('Contracts ready', JSON.stringify({ project: invocation.project, module: invocation.module, runDir: invocation.runDir, completedStep: 'contracts30', nextStep: 'finalize90' }), 'contracts30-done')),
    updateM3Status(context, parentStep, step, hookSequential, 'completed', result.summary),
  ];
}
