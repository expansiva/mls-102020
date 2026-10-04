/// <mls fileReference="_102020_/l2/agentDefsL2/agentDefsL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { D2_AGENT_NAME, D2_HELP, buildD2PlannedSteps, d2StepIdOf, markD2Unavailable, parseD2MessageInvocation, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import '/_102020_/l2/agentDefsL2/steps/entry10/agentD2Entry.js';
import '/_102020_/l2/agentDefsL2/steps/input20/agentD2Input.js';
import '/_102020_/l2/agentDefsL2/steps/pages50/agentD2Pages.js';
import '/_102020_/l2/agentDefsL2/steps/pages50/agentD2PagesPage.js';
import '/_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.js';
import '/_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.js';
import '/_102020_/l2/agentDefsL2/steps/shared60/agentD2Shared.js';
import '/_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.js';
import '/_102020_/l2/agentDefsL2/steps/contracts70/agentD2Contracts70.js';
import '/_102020_/l2/agentDefsL2/steps/finalize80/agentD2Finalize.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2', agentDescription: 'Generate L2 page11, page BFF designs, shared behavior and page contracts', visibility: 'public', beforePromptImplicit, beforePromptStep };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const createTask = (identity: { project: number; module: string; scope: 'all' | 'pages' } | null, human: string, title: string): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai', skipRootLLM: true,
    request: { action: 'addMessageAI', agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentDefsL2 deterministic bootstrap. The root model is disabled.' }, { type: 'human', content: human }],
      taskTitle: title, threadId: context.message.threadId, userMessage: context.message.content,
      longTermMemory: { taskName: 'agentDefsL2', flowName: D2_AGENT_NAME, ...(identity ? { project: String(identity.project), module: identity.module, scope: identity.scope } : { statusOnly: 'true' }) },
    },
  });
  const invocation = parseD2MessageInvocation(userPrompt || context.message.content || '');
  if (invocation.kind !== 'run') {
    const diagnostic = invocation.kind === 'help' ? D2_HELP : invocation.diagnostic;
    return [createTask(null, diagnostic, 'agentDefsL2 status'), addD2Step(context, 1, d2Result('Status', diagnostic, 'status'), true)];
  }
  const identity = { project: invocation.project, module: invocation.module, scope: invocation.scope };
  return [createTask(identity, invocation.module, `define ${invocation.module}`), ...buildD2PlannedSteps(identity).map(step => addD2Step(context, 1, step, true))];
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const stepId = d2StepIdOf(step);
  if (stepId) {
    const identity = parseD2StepInvocation(step.prompt || '', Number(mls.actualProject || 0));
    if (identity.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', identity.diagnostic)];
    const diagnostic = `${stepId} must run through its registered step agent.`;
    await markD2Unavailable(identity, stepId, diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
  if (step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === D2_AGENT_NAME) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }
  const invocation = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  return buildD2PlannedSteps(invocation).map(planned => addD2Step(context, step.stepId, planned));
}
