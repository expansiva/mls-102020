/// <mls fileReference="_102020_/l2/agentDefsL2/agentDefsL2.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { addD2Step, d2Result } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';

/** d2_44 installs the format and pure gates; the /pages execution flow arrives in d2_46. */
export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentDefsL2',
    agentProject: 102020,
    agentFolder: 'agentDefsL2',
    agentDescription: 'Define L2 page11 desktop and mobile pages',
    visibility: 'public',
    beforePromptImplicit,
  };
}

async function beforePromptImplicit(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  _prompt: string,
): Promise<mls.msg.AgentIntent[]> {
  const diagnostic = 'agentDefsL2 /pages is unavailable until the page generation flow is installed.';
  return [
    {
      type: 'add-message-ai',
      skipRootLLM: true,
      request: {
        action: 'addMessageAI',
        agentName: agent.agentName,
        inputAI: [
          { type: 'system', content: 'agentDefsL2 deterministic bootstrap. The root model is disabled.' },
          { type: 'human', content: diagnostic },
        ],
        taskTitle: 'agentDefsL2 status',
        threadId: context.message.threadId,
        userMessage: context.message.content,
        longTermMemory: { taskName: 'agentDefsL2', flowName: 'agentDefsL2', statusOnly: 'true' },
      },
    },
    addD2Step(context, 1, d2Result('Status', diagnostic, 'status'), true),
  ];
}
