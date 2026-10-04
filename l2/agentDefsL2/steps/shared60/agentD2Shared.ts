/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/agentD2Shared.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_SHARED_AGENT_NAME, markD2StepApproved, markD2StepFailed, parseD2StepInvocation, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { executeD2Shared, productionSharedPort, type D2SharedPort } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_SHARED_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/shared60', agentDescription: 'Derive the shared v2 of each page from its approved BFF, without a prompt', visibility: 'private', beforePromptStep };
}

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2SharedPort): Promise<mls.msg.AgentIntent[]> {
  const parsed = typeof argsOrPort === 'object' ? null : parseD2StepInvocation(argsOrPort || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed?.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = parsed ? { project: parsed.project, module: parsed.module } : null;
  try {
    const port = typeof argsOrPort === 'object' ? argsOrPort : await productionSharedPort(identity!);
    const result = await executeD2Shared(port, identity ?? undefined);
    // d2_76: a refused page does not stop the others; finalize80 fails the pipeline once, listing it.
    const refusedNote = result.refused.length ? ` D2_SHARED_PAGES_REFUSED: ${result.refused.map(row => `${row.pageId}: ${row.diagnostic}`).join(' || ')}` : '';
    const pages = [...result.wrote, ...result.reused].sort();
    if (identity) {
      const snapshot = await readD2Input(identity);
      if (snapshot && await readD2Pipeline(identity)) await markD2StepApproved(identity, 'shared60', pages.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/shared60/${pageId}.json`), snapshot.snapshotHash);
    }
    return [addD2Step(context, parentStep.stepId, d2Result('Shared ready', JSON.stringify({ ...(identity ?? {}), completedStep: 'shared60', nextStep: 'contracts70', wrote: result.wrote, reused: result.reused, refused: [...result.skipped, ...result.refused.map(row => row.pageId)] }), 'shared60-done')),
      updateD2Status(context, parentStep, step, hookSequential, 'completed', `shared60 derived ${result.wrote.length}, reused ${result.reused.length} and skipped ${result.skipped.length} refused upstream, without a prompt.${refusedNote}`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    if (identity) await markD2StepFailed(identity, 'shared60', diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
