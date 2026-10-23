/// <mls fileReference="_102020_/l2/agentAssistant/agentAssistant.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Root of agentAssistant (spec: flow.json in this folder). Entry:
//   @@agentAssistant adicione uma salada na mesa 1
// The root never calls the model (skipRootLLM): it records the sentence and the app project in
// the task memory and plants the 'interpret' step. Everything else happens in the steps.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { parseUserText } from '/_102020_/l2/agentAssistant/helpers/asEntry.js';
import { asLabelsFor } from '/_102020_/l2/agentAssistant/helpers/asLabels.js';
import { AS_AGENT_FOLDER, AS_AGENT_PROJECT, actualProject } from '/_102020_/l2/agentAssistant/helpers/asStor.js';
import {
  AS_AGENT_NAME,
  AS_INTERPRET_AGENT,
  AS_INTERPRET_PLAN_ID,
} from '/_102020_/l2/agentAssistant/helpers/asIds.js';
import {
  updateStatusIntent,
} from '/_102020_/l2/agentAssistant/helpers/asSteps.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: AS_AGENT_NAME,
    agentProject: AS_AGENT_PROJECT,
    agentFolder: AS_AGENT_FOLDER,
    agentDescription: 'Runs an action of this app from a sentence: understands it, asks what is missing and confirms before executing',
    visibility: 'public',
    beforePromptImplicit,
    beforePromptStep,
    afterPromptStep,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const userText = context.isTest
    ? String((JSON.parse(userPrompt || '{}') as { prompt?: unknown }).prompt || '').trim()
    : parseUserText(userPrompt, agent.agentName, raw => mls.common.safeParseArgs(raw));
  const labels = asLabelsFor(navigatorLanguage());
  if (!userText) return statusTask(agent, context, labels.emptyPrompt);

  const project = actualProject();
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: 'agentAssistant bootstrap. The root LLM is skipped (skipRootLLM); the interpret step makes the call.' },
        { type: 'human', content: userText },
      ],
      taskTitle: userText.length > 60 ? `${userText.slice(0, 57)}...` : userText,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { flowName: AS_AGENT_NAME, userText, project: String(project) },
    },
  };
  const interpret: mls.msg.AIAgentStep = {
    type: 'agent',
    stepId: 0,
    interaction: null,
    stepTitle: labels.stepInterpret,
    status: 'waiting_human_input',
    nextSteps: [],
    agentName: AS_INTERPRET_AGENT,
    prompt: JSON.stringify({ planId: AS_INTERPRET_PLAN_ID }),
    rags: [],
    planning: { planId: AS_INTERPRET_PLAN_ID, dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
  return [addMessage, rootChildIntent(context, interpret)];
}

// With skipRootLLM the root has no call of its own: its hooks only close it.
async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  return [updateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'Root bootstrap completed (no model).')];
}

function rootChildIntent(context: mls.msg.ExecutionContext, step: mls.msg.AIPayload): mls.msg.AgentIntentAddStep {
  // the task does not exist yet: the backend binds these to the task the add-message-ai creates
  return { type: 'add-step', messageId: '', threadId: context.message.threadId, taskId: '', parentStepId: 1, step };
}

function statusTask(agent: IAgentMeta, context: mls.msg.ExecutionContext, message: string): mls.msg.AgentIntent[] {
  const addMessage: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    skipRootLLM: true,
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [{ type: 'system', content: 'agentAssistant status.' }, { type: 'human', content: message }],
      taskTitle: message.slice(0, 60),
      threadId: context.message.threadId,
      userMessage: context.message.content,
    },
  };
  const result = {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: message,
    result: message,
    planning: { planId: 'status', dependsOn: [], executionMode: 'sequential', executionHost: 'client' },
  } as mls.msg.AIResultStep;
  return [addMessage, rootChildIntent(context, result)];
}

function navigatorLanguage(): string {
  return typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : 'en';
}
