/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_SHARED_AGENT_NAME, M4_SHARED_PAGE_AGENT_NAME, m4ScopeLabel, m4ScopePages, markM4Step, parseM4StepInvocation, type M4RunIdentity, type M4RunScope } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { readM4Snapshot, reusableM4Shared, sharedReceiptInfo, studioSharedPort } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { m4ChainDoneIntent, m4ChainStart } from '/_102020_/l2/agentMaterializeL2/steps/shared40/chain.js';
import { chainPageStep } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_SHARED_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/shared40', agentDescription: 'Dispatch one shared class worker per accepted page', visibility: 'private', beforePromptStep };
}

/** `findings` carries the LLM's report across the repairs: a repair fixes the file and would lose it (05/10). */
export interface M4SharedWorkerArgs extends M4RunIdentity { pageId: string; attempt: number; diagnostic?: string; previous?: string; findings?: Array<{ code: string; message: string }>; scope?: M4RunScope }

export function sharedWorkerStep(args: M4SharedWorkerArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: `Shared${args.attempt > 1 ? ` (repair ${args.attempt - 1})` : ''}`, status: 'waiting_human_input', nextSteps: [],
    agentName: M4_SHARED_PAGE_AGENT_NAME, prompt: JSON.stringify(args), rags: [],
    planning: { planId: `shared40-${args.pageId}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

/** Emits the done-anchor once every page in scope has a reusable shared; null while any is missing. */
export async function m4SharedDoneIntents(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, identity: M4RunIdentity, scope: M4RunScope = {}): Promise<mls.msg.AgentIntent | null> {
  const snapshot = await readM4Snapshot(identity, studioSharedPort);
  const pages = m4ScopePages(snapshot.accepted, scope);
  for (const pageId of pages) if (!await reusableM4Shared(identity, pageId, studioSharedPort, snapshot)) return null;
  await markM4Step(identity, 'shared40', { status: 'approved', artifactPaths: pages.map(pageId => displayPath(sharedReceiptInfo(identity, pageId))), snapshotHash: snapshot.snapshotHash });
  return addAgentStep(context, parentStep.stepId, agentResult('Shared ready', JSON.stringify({ ...identity, completedStep: 'shared40', pages, scope: m4ScopeLabel(scope) }), 'shared40-done'));
}


async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const identity = { project: invocation.project, module: invocation.module };
  const scope = invocation.scope;
  try {
    // One chain per page (shared, then pages, then reviews): each page moves on as soon as its own shared is approved.
    // Each chain lives under a group step of its page (agentM4ChainPage), so the run reads page by page.
    const { steps, pages, chains } = await m4ChainStart(identity, scope);
    if (!steps.length) {
      const done = await m4ChainDoneIntent(context, parentStep, identity, scope);
      return [...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `shared40 reused every unit of ${pages.length} page(s) without an LLM call (${m4ScopeLabel(scope)}).`)];
    }
    const groups = chains.map(chain => addAgentStep(context, parentStep.stepId, chainPageStep({ ...identity, pageId: chain.pageId, scope, units: chain.steps })));
    return [...groups, updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Started ${chains.length} page chain(s): ${chains.map(chain => `${chain.pageId} [${chain.steps.map(worker => worker.stepTitle).join(', ')}]`).join('; ')} (${m4ScopeLabel(scope)}).`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await markM4Step(identity, 'shared40', { status: 'failed', diagnostic }); } catch { /* pipeline missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
