/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.ts" enhancement="_blank"/>

import type { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { M4_PAGES_AGENT_NAME, M4_PAGES_PAGE_AGENT_NAME, m4ScopeDevices, m4ScopeLabel, m4ScopePages, markM4Step, parseM4StepInvocation, type M4RunIdentity, type M4RunScope } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult, updateAgentStatus } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { displayPath } from '/_102035_/l2/solution/fs.js';
import type { L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { readM4Snapshot } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { pageReceiptInfo, reusableM4Page, studioPagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';

export function createAgent(): IAgentAsync {
  return { agentName: M4_PAGES_AGENT_NAME, agentProject: 102020, agentFolder: 'agentMaterializeL2/steps/pages50', agentDescription: 'Dispatch one page worker per accepted page and device', visibility: 'private', beforePromptStep };
}

export interface M4PageWorkerArgs extends M4RunIdentity { pageId: string; device: L2Page11Device; attempt: number; diagnostic?: string; previous?: string; design?: unknown; scope?: M4RunScope; chain?: boolean }

export function pageWorkerStep(args: M4PageWorkerArgs): mls.msg.AIAgentStep {
  return {
    type: 'agent', stepId: 0, interaction: null, stepTitle: `Page ${args.chain ? '' : `${args.pageId} `}${args.device}${args.attempt > 1 ? ` (repair ${args.attempt - 1})` : ''}`, status: 'waiting_human_input', nextSteps: [],
    agentName: M4_PAGES_PAGE_AGENT_NAME, prompt: JSON.stringify(args), rags: [],
    planning: { planId: `pages50-${args.pageId}-${args.device}-${args.attempt}`, dependsOn: [], executionMode: 'parallel_dynamic', executionHost: 'client' },
  } as mls.msg.AIAgentStep;
}

/** Emits pages50-done once every page × device in scope is reusable; null while any is missing. */
export async function m4PagesDoneIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, identity: M4RunIdentity, scope: M4RunScope = {}): Promise<mls.msg.AgentIntent | null> {
  const snapshot = await readM4Snapshot(identity, studioPagePort);
  const pages = m4ScopePages(snapshot.accepted, scope);
  const devices = m4ScopeDevices(scope);
  for (const pageId of pages) for (const device of devices) if (!await reusableM4Page(identity, pageId, device, studioPagePort, snapshot)) return null;
  const receipts = pages.flatMap(pageId => devices.map(device => displayPath(pageReceiptInfo(identity, pageId, device))));
  await markM4Step(identity, 'pages50', { status: 'approved', artifactPaths: receipts, snapshotHash: snapshot.snapshotHash });
  return addAgentStep(context, parentStep.stepId, agentResult('Pages ready', JSON.stringify({ ...identity, completedStep: 'pages50', pages, devices, scope: m4ScopeLabel(scope) }), 'pages50-done'));
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
    for (const pageId of pages) for (const device of devices) if (!await reusableM4Page(identity, pageId, device, studioPagePort, snapshot)) pending.push({ pageId, device });
    const total = pages.length * devices.length;
    if (!pending.length) {
      const done = await m4PagesDoneIntent(context, parentStep, identity, scope);
      return [...(done ? [done] : []), updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `pages50 reused ${total} page(s) without an LLM call (${m4ScopeLabel(scope)}).`)];
    }
    const workers = pending.map(unit => addAgentStep(context, parentStep.stepId, pageWorkerStep({ ...identity, ...unit, attempt: 1, scope })));
    return [...workers, updateAgentStatus(context, parentStep, step, hookSequential, 'completed', `Dispatched ${pending.length} page worker(s) [${pending.map(unit => `${unit.pageId}/${unit.device}`).join(', ')}]; ${total - pending.length} reused (${m4ScopeLabel(scope)}).`)];
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    try { await markM4Step(identity, 'pages50', { status: 'failed', diagnostic }); } catch { /* pipeline missing */ }
    return [updateAgentStatus(context, parentStep, step, hookSequential, 'failed', diagnostic)];
  }
}
