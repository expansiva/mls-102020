/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.ts" enhancement="_blank"/>

// review55 dispatcher: one review worker per page × device in scope. Planned only with --review.

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import {
  M4_REVIEW_AGENT_NAME, M4_REVIEW_PAGE_AGENT_NAME, m4ScopeDevices, m4ScopeLabel, m4ScopePages, markM4Step, parseM4StepInvocation, type M4RunIdentity, type M4RunScope,
} from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';
import type { L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { readM4Snapshot } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { studioPagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { m4ReviewState, reviewReceiptInfo, type M4ReviewReceipt } from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_REVIEW_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/review55', agentDescription: 'Dispatch one review worker per generated page and device', visibility: 'private', beforePromptStep };
}

export interface M4ReviewWorkerArgs extends M4RunIdentity { pageId: string; device: L2Page11Device; scope?: M4RunScope; chain?: boolean }

export function reviewWorkerStep(args: M4ReviewWorkerArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: `Review ${args.chain ? '' : `${args.pageId} `}${args.device}`, status: 'waiting_human_input', nextSteps: [],
    agentName: M4_REVIEW_PAGE_AGENT_NAME, prompt: JSON.stringify(args), rags: [],
    planning: { planId: `review55-${args.pageId}-${args.device}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

/** Emits review55-done once every unit in scope has a review of its current page (done or failed); null otherwise. */
export async function m4ReviewDoneIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, identity: M4RunIdentity, scope: M4RunScope = {}): Promise<mls.msg.AgentIntent | null> {
  const snapshot = await readM4Snapshot(identity, studioPagePort);
  const pages = m4ScopePages(snapshot.accepted, scope);
  const devices = m4ScopeDevices(scope);
  for (const pageId of pages) for (const device of devices) if (!(await m4ReviewState(identity, pageId, device, studioPagePort, snapshot)).settled) return null;
  const counts = { blocker: 0, major: 0, minor: 0, failed: 0 };
  for (const pageId of pages) for (const device of devices) {
    const receipt = await studioPagePort.readJson<M4ReviewReceipt>(reviewReceiptInfo(identity, pageId, device));
    if (receipt?.failed) counts.failed += 1;
    for (const item of receipt?.findings ?? []) counts[item.severity] += 1;
  }
  const receipts = pages.flatMap(pageId => devices.map(device => displayPath(reviewReceiptInfo(identity, pageId, device))));
  await markM4Step(identity, 'review55', { status: 'approved', artifactPaths: receipts, snapshotHash: snapshot.snapshotHash });
  return addAgentStep(context, parentStep.stepId, agentResult('Review ready', JSON.stringify({ ...identity, completedStep: 'review55', pages, devices, findings: counts, scope: m4ScopeLabel(scope) }), 'review55-done'));
}


async function beforePromptStep(_agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number, args?: string): Promise<mls.msg.AgentIntent[]> {
  const invocation = parseM4StepInvocation(args || step.prompt || '');
  if (invocation.kind === 'refusal') return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', invocation.diagnostic)];
  const identity = { project: invocation.project, module: invocation.module };
  const scope = invocation.scope;
  try {
    const snapshot = await readM4Snapshot(identity, studioPagePort);
    const pages = m4ScopePages(snapshot.accepted, scope);
    const devices = m4ScopeDevices(scope);
    // --force was applied once by the chains of shared40; a sweeper never invalidates again.
    const pending: Array<{ pageId: string; device: L2Page11Device }> = [];
    for (const pageId of pages) for (const device of devices) if (!(await m4ReviewState(identity, pageId, device, studioPagePort, snapshot)).reusable) pending.push({ pageId, device });
    const total = pages.length * devices.length;
    if (!pending.length) {
      const done = await m4ReviewDoneIntent(context, parentStep, identity, scope);
      return [...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `review55 reused ${total} review(s) without an LLM call (${m4ScopeLabel(scope)}).`)];
    }
    // A failed review left from an earlier run must not settle this one: clear it before dispatching.
    for (const unit of pending) await studioPagePort.writeJson(reviewReceiptInfo(identity, unit.pageId, unit.device), { invalidated: 'pending', at: new Date().toISOString() });
    const workers = pending.map(unit => addAgentStep(context, parentStep.stepId, reviewWorkerStep({ ...identity, ...unit, scope })));
    return [...workers, updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Dispatched ${pending.length} review worker(s) [${pending.map(unit => `${unit.pageId}/${unit.device}`).join(', ')}]; ${total - pending.length} reused (${m4ScopeLabel(scope)}).`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await markM4Step(identity, 'review55', { status: 'failed', diagnostic }); } catch { /* pipeline missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
