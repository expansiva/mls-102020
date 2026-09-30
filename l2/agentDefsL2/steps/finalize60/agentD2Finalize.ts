/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/agentD2Finalize.ts" enhancement="_102027_/l2/enhancementAgent"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { D2_FINALIZE_AGENT_NAME, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { finalizeD2Pages } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_FINALIZE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/finalize60', agentDescription: 'Compile and close page11 definitions', visibility: 'private', beforePromptStep };
}
async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  try {
    const result = await finalizeD2Pages(parsed);
    return [updateD2Status(context, parentStep, step, hookSequential, result.report.status === 'complete' ? 'completed' : 'failed',
      result.report.status === 'complete' ? `finalize60 complete: ${result.report.artifactPaths.length} page11 defs.` : result.report.pending.join('; '))];
  } catch (error) {
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))];
  }
}
