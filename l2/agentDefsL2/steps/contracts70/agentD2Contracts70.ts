/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { executeD2Contracts70, productionContractsPort, type D2Contracts70Port } from '/_102020_/l2/agentDefsL2/steps/contracts70/run.js';

export const D2_CONTRACTS70_AGENT_NAME = 'agentD2Contracts70' as const;

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_CONTRACTS70_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/contracts70',
    agentDescription: 'Render one BFF contract per page from the approved shared', visibility: 'private', beforePromptStep,
  };
}

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2Contracts70Port): Promise<mls.msg.AgentIntent[]> {
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : await productionContractsPort(parsedIdentity(argsOrPort || step.prompt || ''));
    const result = await executeD2Contracts70(port);
    return [
      addD2Step(context, parentStep.stepId, d2Result('Contracts ready', JSON.stringify({ completedStep: 'contracts70', wrote: result.wrote, reused: result.reused }), 'contracts70-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `contracts70 wrote ${result.wrote.length} and reused ${result.reused.length}.`),
    ];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}

function parsedIdentity(raw: string): { project: number; module: string } {
  const parsed = parseD2StepInvocation(raw, Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') throw new Error(parsed.diagnostic);
  return parsed;
}
