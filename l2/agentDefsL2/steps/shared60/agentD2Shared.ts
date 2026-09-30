/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/agentD2Shared.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_SHARED_AGENT_NAME, D2_SHARED_PAGE_AGENT_NAME, markD2StepApproved, parseD2StepInvocation, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { reusableD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared60/agentD2SharedPage.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_SHARED_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/shared60', agentDescription: 'Dispatch one shared v2 worker per selected page', visibility: 'private', beforePromptStep };
}

export function sharedWorkerSteps(identity: { project: number; module: string }, pending: string[]): mls.msg.AIAgentStep[] {
  return pending.map(pageId => ({
    type: 'agent', stepId: 0, interaction: null, stepTitle: `Shared ${pageId}`, status: 'waiting_human_input', nextSteps: [],
    agentName: D2_SHARED_PAGE_AGENT_NAME, prompt: JSON.stringify({ ...identity, pageId, attempt: 1 }),
    rags: [], planning: { planId: `shared60-${pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep));
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  try {
    const snapshot = await readD2Input(parsed);
    if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
    const ids = [...snapshot.selection.writePageIds].sort();
    const reusable = new Set<string>();
    for (const pageId of ids) if (await reusableD2Shared(parsed, pageId)) reusable.add(pageId);
    const pending = ids.filter(pageId => !reusable.has(pageId));
    if (!pending.length) {
      if (await readD2Pipeline(parsed)) await markD2StepApproved(parsed, 'shared60', ids.map(pageId => `l2/${parsed.module}/pipeline/agentDefsL2/shared60/${pageId}.json`), snapshot.snapshotHash);
      return [addD2Step(context, parentStep.stepId, d2Result('Shared ready', JSON.stringify({ project: parsed.project, module: parsed.module, completedStep: 'shared60', nextStep: 'contracts70', pages: ids.length }), 'shared60-done')),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `shared60 reused ${ids.length} shared unit(s).`)];
    }
    const workers = sharedWorkerSteps(parsed, pending).map(worker => addD2Step(context, parentStep.stepId, worker));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `Dispatched ${workers.length} shared v2 worker(s); ${reusable.size} reused.`)];
  } catch (error) { return [updateD2Status(context, parentStep, step, hookSequential, 'failed', error instanceof Error ? error.message : String(error))]; }
}
