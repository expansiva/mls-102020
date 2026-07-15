/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/verify-create-layouts/agentCfeVerifyCreateLayouts.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { createUpdateStatusIntent, verifyCreateRunPrimaryLayouts } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentCfeVerifyCreateLayouts',
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/verify-create-layouts',
    agentDescription: 'Fail the sequential creation barrier when a primary page layout was not saved',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const runId = parseRunId(step.prompt);
    const failures = verifyCreateRunPrimaryLayouts(runId);
    if (failures.length > 0) throw new Error(`Primary layout validation failed:\n${failures.join('\n')}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'All primary page11 layouts were saved.')];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    // This is deliberately sequential: a strict primary-layout failure must block materialization,
    // but must never mark a parallel child failed while the fan-out still has queued work.
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

function parseRunId(value: string | undefined): string {
  const parsed = value ? JSON.parse(value) as Record<string, unknown> : {};
  const runId = typeof parsed.runId === 'string' ? parsed.runId : '';
  if (!runId) throw new Error('missing create execution runId');
  return runId;
}
