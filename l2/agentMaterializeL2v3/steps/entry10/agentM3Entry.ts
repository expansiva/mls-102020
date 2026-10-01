/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/entry10/agentM3Entry.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addM3Step, m3Result, updateM3Status } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Intents.js';
import { parseM3StepInvocation } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { executeM3Entry, productionEntryPort } from '/_102020_/l2/agentMaterializeL2v3/steps/entry10/run.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentM3Entry', agentProject: 102020, agentFolder: 'agentMaterializeL2v3/steps/entry10',
    agentDescription: 'Start a materialize run: write run.json without an LLM call', visibility: 'private', beforePromptStep,
  };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM3StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const result = await executeM3Entry(productionEntryPort(invocation), invocation, String(context.message?.content || ''));
  if (result.status === 'failed') return [updateM3Status(context, parentStep, step, hookSequential, 'failed', result.reason)];
  return [
    addM3Step(context, parentStep.stepId, m3Result('Entry ready', JSON.stringify({ ...invocation, completedStep: 'entry10', nextStep: 'input20' }), 'entry10-done')),
    updateM3Status(context, parentStep, step, hookSequential, 'completed', result.summary),
  ];
}
