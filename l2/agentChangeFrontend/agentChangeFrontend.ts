/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentChangeFrontend.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createAgentStepPayload } from '/_102020_/l2/agentChangeFrontend/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentChangeFrontend',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'Stage 2 frontend reconciler. Create-only frontend defs and config from l4.',
    visibility: 'public',
    beforePromptImplicit,
    afterPromptStep,
  };
}

async function beforePromptImplicit(agent: IAgentMeta, context: mls.msg.ExecutionContext, userPrompt: string): Promise<mls.msg.AgentIntent[]> {
  const addMessageAI: mls.msg.AgentIntentAddMessageAI = {
    type: 'add-message-ai',
    request: {
      action: 'addMessageAI',
      agentName: agent.agentName,
      inputAI: [
        { type: 'system', content: systemPrompt },
        { type: 'human', content: userPrompt || 'Run agentChangeFrontend create-only scan.' },
      ],
      taskTitle: 'agentChangeFrontend',
      threadId: context.message.threadId,
      userMessage: context.message.content,
      longTermMemory: { taskName: 'agentChangeFrontend', flowName: 'agentChangeFrontend', version: 'create-v1' },
    },
  };
  return [addMessageAI];
}

async function afterPromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${agent.agentName}] task invalid`);
  const scanStep = createAgentStepPayload(
    'scan-create-l4',
    'agentCfeCreateScanL4',
    'Ler L4 e criar paginas pendentes',
    {},
    [],
    'sequential',
    'waiting_human_input',
  );
  return [createAddStepIntent(context, step, scanStep)];
}

const systemPrompt = `
<!-- modelType: codefast -->

Return only:
{ "type": "result", "result": "ok" }

This root agent ignores the model result in create-v1. It only starts the deterministic L4 scan and create-only frontend flow.
`;
