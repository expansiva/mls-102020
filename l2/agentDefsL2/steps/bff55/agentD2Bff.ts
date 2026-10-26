/// <mls fileReference="_102020_/l2/agentDefsL2/steps/bff55/agentD2Bff.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readD2Input } from '/_102020_/l2/helpers/defsInput/io.js';
import { D2_BFF_AGENT_NAME, D2_BFF_PAGE_AGENT_NAME, markD2StepApproved, markD2StepFailed, parseD2StepInvocation, readD2Pipeline } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { addD2Step, d2Result, updateD2Status } from '/_102020_/l2/agentDefsL2/helpers/d2Intents.js';
import { reusableD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/agentD2BffPage.js';
import { readApprovedD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

export interface D2BffDispatchPort {
  readInput: typeof readD2Input;
  reusable: typeof reusableD2Bff;
  readApproved: typeof readApprovedD2Bff;
  readPipeline: typeof readD2Pipeline;
  markApproved: typeof markD2StepApproved;
  markFailed: typeof markD2StepFailed;
}

const dispatchPort: D2BffDispatchPort = {
  readInput: readD2Input,
  reusable: reusableD2Bff,
  readApproved: readApprovedD2Bff,
  readPipeline: readD2Pipeline,
  markApproved: markD2StepApproved,
  markFailed: markD2StepFailed,
};

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

function bffDispatchTrace(workers: number, reused: number, contractKept: string[], missingDesign: string[], listed: boolean): string {
  if (!listed) return `Dispatched ${workers} BFF worker(s); ${reused} reused.`;
  const missing = missingDesign.length ? ` Ran for missing approved design: ${missingDesign.join(', ')}.` : '';
  return `Dispatched ${workers} BFF worker(s); ${reused} reused; ${contractKept.length} skipped, contract kept.${missing}`;
}

export async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, argsOrPort?: string | D2BffDispatchPort): Promise<mls.msg.AgentIntent[]> {
  const port = typeof argsOrPort === 'object' ? argsOrPort : dispatchPort;
  const parsed = parseD2StepInvocation(typeof argsOrPort === 'string' ? argsOrPort : step.prompt || '', Number(mls.actualProject || 0));
  if (parsed.kind === 'refusal') return [updateD2Status(context, parentStep, step, hookSequential, 'failed', parsed.diagnostic)];
  const identity = { project: parsed.project, module: parsed.module };
  const listed = parsed.bffPages ? new Set(parsed.bffPages) : null;
  try {
    const snapshot = await port.readInput(identity);
    if (!snapshot) throw new Error('D2_BFF_INPUT_MISSING');
    const ids = [...snapshot.selection.writePageIds].sort();
    const reusable = new Set<string>();
    const contractKept: string[] = [];
    const missingDesign: string[] = [];
    const pending: string[] = [];
    for (const pageId of ids) {
      if (await port.reusable(identity, pageId)) { reusable.add(pageId); continue; }
      if (listed && !listed.has(pageId)) {
        const approved = await port.readApproved(identity, pageId);
        if (approved) { reusable.add(pageId); contractKept.push(pageId); continue; }
        missingDesign.push(pageId);
      }
      pending.push(pageId);
    }
    if (!pending.length) {
      if (await port.readPipeline(identity)) await port.markApproved(identity, 'bff55', ids.map(pageId => `l2/${identity.module}/pipeline/agentDefsL2/bff/${pageId}.json`), snapshot.snapshotHash);
      const kept = listed ? `; ${contractKept.length} skipped, contract kept` : '';
      return [addD2Step(context, parentStep.stepId, d2Result('BFF ready', JSON.stringify({ ...identity, completedStep: 'bff55', nextStep: 'shared60', pages: ids.length }), 'bff55-done')),
        updateD2Status(context, parentStep, step, hookSequential, 'completed', `bff55 reused ${ids.length} page design(s)${kept}.`)];
    }
    const workers = bffWorkerSteps(identity, pending).map(worker => addD2Step(context, parentStep.stepId, worker));
    return [...workers, updateD2Status(context, parentStep, step, hookSequential, 'completed', bffDispatchTrace(workers.length, reusable.size, contractKept, missingDesign, listed !== null))];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    await port.markFailed(identity, 'bff55', diagnostic);
    return [updateD2Status(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
