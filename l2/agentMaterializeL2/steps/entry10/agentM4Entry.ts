/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/entry10/agentM4Entry.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_ENTRY_AGENT_NAME, initializeM4Pipeline, parseM4StepInvocation } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_ENTRY_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/entry10', agentDescription: 'Initialize an L2 materialization run without an LLM call', visibility: 'private', beforePromptStep };
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  try {
    const identity = { project: invocation.project, module: invocation.module };
    await initializeM4Pipeline(identity, invocation.scope);
    return [
      addAgentStep(context, parentStep.stepId, agentResult('Entry ready', JSON.stringify({ ...identity, scope: invocation.scope, completedStep: 'entry10', nextStep: 'input20' }), 'entry10-done')),
      updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `entry10 initialized ${identity.project}/${identity.module}`),
    ];
  } catch (error) {
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
