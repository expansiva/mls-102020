/// <mls fileReference="_102020_/l2/agentDefsL2/steps/entry10/agentD2Entry.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D2_ENTRY_AGENT_NAME,
  initializeD2Pipeline,
  parseD2StepInvocation,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_ENTRY_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentDefsL2/steps/entry10',
    agentDescription: 'Initialize an agentDefsL2 run without an LLM call',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  }
  try {
    const identity = { project: invocation.project, module: invocation.module };
    await initializeD2Pipeline(identity);
    const result = JSON.stringify({ ...identity, completedStep: 'entry10', nextStep: 'input20' });
    return [
      addD2Step(context, parentStep.stepId, d2Result('Entry ready', result, 'entry10-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `entry10 initialized ${identity.project}/${identity.module}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', message)];
  }
}
