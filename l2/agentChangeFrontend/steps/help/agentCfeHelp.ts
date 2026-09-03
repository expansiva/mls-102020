/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/help/agentCfeHelp.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createAddStepIntent, createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

interface HelpArgs {
  reason?: string;
  helpText?: string;
}

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeHelp',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/help',
    agentDescription: 'Return agentChangeFrontend CLI help and finish the task',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseHelpArgs(step.prompt);
    const result = [args.reason, args.helpText].filter(Boolean).join(args.reason ? '\n\n' : '');
    return [
      createAddStepIntent(context, step, createResultStep(result) as any),
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'help returned'),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parseHelpArgs(prompt: string | undefined): HelpArgs {
  if (!prompt) return {};
  try {
    const parsed = JSON.parse(prompt);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as HelpArgs : {};
  } catch {
    return {};
  }
}

function createResultStep(result: string): mls.msg.AIPayload {
  return {
    type: 'result',
    stepId: 0,
    status: 'completed',
    interaction: null,
    nextSteps: [],
    stepTitle: 'Help',
    result,
    planning: {
      planId: 'help-result',
      dependsOn: [],
      executionMode: 'sequential',
      executionHost: 'client',
    },
  } as any;
}
