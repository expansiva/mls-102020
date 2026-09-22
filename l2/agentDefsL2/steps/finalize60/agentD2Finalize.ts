/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/agentD2Finalize.ts" enhancement="_102027_/l2/enhancementAgent"/>
import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { D2_FINALIZE_AGENT_NAME, markD2FinalizeBlocked, parseD2StepInvocation } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { finalizeD2 } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';
export function createAgent(): IAgentAsync { return { agentName: D2_FINALIZE_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/finalize60', agentDescription: 'Deterministically verify, reconcile and close L2 definitions', visibility: 'private', beforePromptStep }; }
async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = { project: parsed.project, module: parsed.module };
  try { const result = await finalizeD2(identity); if (result.report.status !== 'complete') { const diagnostic = result.report.pending.join('; '); await markD2FinalizeBlocked(identity, diagnostic, result.report.snapshotHash); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)]; } return [updateD2Status(context, parentStep, step, hookSequential, 'completed', `finalize60 complete: ${result.report.artifactPaths.length} defs, ${result.report.removed.length} removed.`)]; }
  catch (error) { const diagnostic = error instanceof Error ? error.message : String(error); await markD2FinalizeBlocked(identity, diagnostic); return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)]; }
}
