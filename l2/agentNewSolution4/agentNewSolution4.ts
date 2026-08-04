/// <mls fileReference="_102020_/l2/agentNewSolution4/agentNewSolution4.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  isNs4ModuleToken,
  parseNs4Invocation,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  listNs4ModuleFolders,
  ns4FileExists,
  ns4ModuleFile,
  readNs4Pipeline,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Fs.js';
import {
  afterNs4E1PromptStep,
  beforeNs4E1ClarificationStep,
  loadNs4E1SystemPrompt,
  loadNs4StatusPrompt,
} from '/_102020_/l2/agentNewSolution4/steps/e1/agentNs4E1.js';


// === Agent Definition ===
export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentNewSolution4',
    agentProject: 102020,
    agentFolder: 'agentNewSolution4',
    agentDescription: 'L4 v4 product compiler — E1 initial module contract',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep: afterNs4E1PromptStep,
    beforeClarificationStep: beforeNs4E1ClarificationStep,
  };
}

export const NS4_AGENT_BUILD = 'build-1 (2026-08-04) E1 clarification + partial module.defs + resume';

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  userPrompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseNs4Invocation(userPrompt || '');
  if (!invocation.prompt) {
    return [await statusTask(agent, context, 'Informe o nome ou a descrição do módulo após @@newSolution4.', 'new Solution 4', true)];
  }

  let sourcePrompt = invocation.prompt;
  let resumeModule = '';
  let taskTitle = 'new Solution 4';

  if (isNs4ModuleToken(invocation.prompt) && listNs4ModuleFolders().has(invocation.prompt)) {
    const pipeline = await readNs4Pipeline(invocation.prompt);
    const action = resolveNs4ExistingAction(true, pipeline, ns4FileExists(ns4ModuleFile(invocation.prompt)));
    if (action === 'collision') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}" já existe, mas não possui pipeline do agentNewSolution4. Nada foi alterado.`,
        `plan ${invocation.prompt}`,
        true,
      )];
    }
    if (action === 'resume-next') {
      return [await statusTask(
        agent,
        context,
        `Módulo "${invocation.prompt}": E1 já está aprovado. O próximo passo é e2-journeys, ainda não implementado nesta entrega.`,
        `plan ${invocation.prompt}`,
      )];
    }
    resumeModule = invocation.prompt;
    sourcePrompt = pipeline?.sourcePrompt || invocation.prompt;
    taskTitle = `plan ${invocation.prompt}`;
  }

  const systemPrompt = await loadNs4E1SystemPrompt();
  return [{
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: `## Initial request\n${sourcePrompt}` },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4',
        flowName: 'agentNewSolution4',
        sourcePrompt,
        ...(invocation.fast ? { fastMode: 'true' } : {}),
        ...(resumeModule ? { resumeModule } : {}),
      },
    },
  } as mls.msg.AgentIntentAddMessageAI];
}

async function statusTask(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  message: string,
  taskTitle = 'new Solution 4',
  isError = false,
): Promise<mls.msg.AgentIntentAddMessageAI> {
  return {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: await loadNs4StatusPrompt(message) },
        { type: 'human', content: message },
      ],
      taskTitle,
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: {
        taskName: 'newSolution4',
        flowName: 'agentNewSolution4',
        statusOnly: 'true',
        statusOutcome: isError ? 'error' : 'info',
      },
    },
  };
}
