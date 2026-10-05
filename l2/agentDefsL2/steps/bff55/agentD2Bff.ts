/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_BFF_AGENT_NAME, D2_BFF_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, parseD2StepInvocation, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { reusableD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.js';

export function createAgent(): IAgentAsync {
  return { agentName: D2_BFF_AGENT_NAME, agentProject: 102020, agentFolder: 'agentDefsL2/steps/bff55', agentDescription: 'Dispatch one BFF design worker per selected page', visibility: 'private', beforePromptStep };
}

export function bffWorkerSteps(identity: { project: number; module: string }, pending: string[]): mls.msg.AIAgentStep[] {
  return pending.map(pageId => ({
    type: 'agent', stepId: 0, interaction: null, stepTitle: `BFF ${pageId}`, status: 'waiting_human_input', nextSteps: [],
    agentName: D2_BFF_PAGE_AGENT_NAME, prompt: JSON.stringify({ ...identity, pageId, attempt: 1 }),
    rags: [], planning: { planId: `bff55-${pageId}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep));
}

async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const parsed = parseD2StepInvocation(args || step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = { project: parsed.project, module: parsed.module };
  try {
    const snapshot = await readD2Input(identity);
    if (!snapshot) throw new Error('D2_BFF_INPUT_MISSING');
    const ids = [...snapshot.selection.writePageIds].sort();
    const reusable = new Set<string>();
    for (const pageId of ids) if (await reusableD2Bff(identity, pageId)) reusable.add(pageId);
    const pending = ids.filter(pageId => !reusable.has(pageId));
    if (!pending.length) {
      if (await readD2Pipeline(identity)) await markD2StepApproved(identity, 'bff55', ids.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/bff/${pageId}.json`), snapshot.snapshotHash);
      return [addD2Step(context, parentStep.stepId, d2Result('BFF ready', JSON.stringify({ ...identity, completedStep: 'bff55', nextStep: 'shared60', pages: ids.length }), 'bff55-done')),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `bff55 reused ${ids.length} page design(s).`)];
    }
    const workers = bffWorkerSteps(identity, pending).map(worker => addD2Step(context, parentStep.stepId, worker));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', `Dispatched ${workers.length} BFF worker(s); ${reusable.size} reused.`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    await markD2StepFailed(identity, 'bff55', diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
