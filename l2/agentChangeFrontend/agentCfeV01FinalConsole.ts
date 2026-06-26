/// <mls fileReference="_102020_/l2/agentChangeFrontend/agentCfeV01FinalConsole.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, logPrefix, parseStepArgs } from '/_102020_/l2/agentChangeFrontend/cfeV01Shared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeV01FinalConsole',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend',
    agentDescription: 'v0.1 final console barrier after page child tests',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseStepArgs(args || step.prompt);
  const scan = parsed.scan;
  console.log(`${logPrefix(agent)} completed page-child parallel test pages=${scan?.pageCount ?? 0} owners=${scan?.ownerCount ?? 0} modules=${scan?.moduleNames?.join(',') || '(none)'}`);
  return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed')];
}
