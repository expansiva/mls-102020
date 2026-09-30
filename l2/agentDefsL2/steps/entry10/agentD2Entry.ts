/// <mls fileReference="_102020_/l2/agentDefsL2/steps/entry10/agentD2Entry.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { D2_ENTRY_AGENT_NAME, initializeD2Pipeline, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_ENTRY_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/entry10', agentDescription: 'Initialize a page11 run without an LLM call', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  try {
    await initializeD2Pipeline(invocation);
    return [
      addD2Step(context, parentStep.stepId, d2Result('Entry ready', JSON.stringify({ ...invocation, completedStep: 'entry10', nextStep: 'input20' }), 'entry10-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `entry10 initialized ${invocation.project}/${invocation.module}`),
    ];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
