/// <mls fileReference="_102020_/l2/agentDefsL2/agentDefsL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  D2_AGENT_NAME,
  D2_HELP,
  buildD2PlannedSteps,
  d2StepIdOf,
  markD2Unavailable,
  parseD2MessageInvocation,
  parseD2StepInvocation,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import '/_102020_/l2/agentDefsL2/steps/entry10/agentD2Entry.js';
import '/_102020_/l2/agentDefsL2/steps/input20/agentD2Input.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: D2_AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentDefsL2',
    agentDescription: 'Generate typed L2 definitions from approved L4 and planner inputs',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const createTask = (
    identity: { project: number; module: string } | null,
    human: string,
    title: string,
  ): mls.msg.AgentIntentAddMessageAI => ({
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentDefsL2 deterministic bootstrap. The root model is disabled.' },
        { type: 'human', content: human },
      ],
      taskTitle: title,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'agentDefsL2',
        flowName: D2_AGENT_NAME,
        ...(identity ? { project: String(identity.project), module: identity.module } : { statusOnly: 'true' }),
      },
    },
  });
  const invocation = parseD2MessageInvocation(userPrompt || context.message.content || '');
  if (invocation.kind === 'help') {
    return [createTask(null, D2_HELP, 'agentDefsL2 help'), addD2Step(context, 1, d2Result('Status', D2_HELP, 'status'), true)];
  }
  if (invocation.kind === 'refusal') {
    return [
      createTask(null, invocation.diagnostic, 'agentDefsL2 status'),
      addD2Step(context, 1, d2Result('Status', invocation.diagnostic, 'status'), true),
    ];
  }

  const identity = { project: invocation.project, module: invocation.module };
  return [
    createTask(identity, invocation.module, `define l2 ${invocation.module}`),
    ...buildD2PlannedSteps(identity).map(step => addD2Step(context, 1, step, true)),
  ];
}

async function beforePromptStep(
  _agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {
  const stepId = d2StepIdOf(step);
  if (stepId) {
    const identity = parseD2StepInvocation(step.prompt || '', Number(mls.actualProject || 0));
    if (identity.kind === 'refusal') {
      return [updateD2Status(context, parentStep, step, hookSequential, 'failed', identity.diagnostic)];
    }
    const diagnostic = `${stepId} is unavailable in flow ${D2_AGENT_NAME}; stop without marking the phase complete.`;
    await markD2Unavailable(identity, stepId, diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }

  if (isMessageRoot(context, step)) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'completed', 'Deterministic message bootstrap completed.')];
  }

  const invocation = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (invocation.kind === 'refusal') {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  }
  const identity = { project: invocation.project, module: invocation.module };
  return buildD2PlannedSteps(identity).map(planned => addD2Step(context, step.stepId, planned));
}

function isMessageRoot(context: mls.msg.ExecutionContext, step: mls.msg.AIAgentStep): boolean {
  return step.stepId === 1 && context.task?.iaCompressed?.longMemory?.flowName === D2_AGENT_NAME;
}
