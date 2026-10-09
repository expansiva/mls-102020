/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/chain.ts" enhancement="_blank"/>

// The per-page chain (Guilherme, 05/10/2026: a page must not wait for every other shared, nor a review for
// every other page). shared40 starts one chain per page in scope:
//   shared approved → that page's desktop/mobile workers → each approved page → its review (with --review).
// An added step that is not waiting_dependency runs at once (skills/collab_messages.md), so each page moves
// on as soon as its own previous unit is approved. `shared40-done` is emitted only when every chain in scope
// is settled; pages50 and review55 stay in the plan as sweepers: they usually find everything done, and only
// dispatch what a chain left behind (a resumed run). `--force` is applied here, once, at the start.

import { displayPath } from '/_102035_/l2/solution/fs.js';
import { m4ScopeDevices, m4ScopeLabel, m4ScopePages, markM4Step, type M4RunIdentity, type M4RunScope } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import type { L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import type { M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { readM4Snapshot, reusableM4Shared, sharedReceiptInfo } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { sharedWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import { pageReceiptInfo, reusableM4Page, studioPagePort, type M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { pageWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import { m4ReviewState, reviewReceiptInfo } from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';
import { reviewWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';

const invalid = (reason: string) => ({ invalidated: reason, at: new Date().toISOString() });

/** --force, once, at the start of the chains: the receipts in scope stop matching. */
export async function m4ChainForce(identity: M4RunIdentity, scope: M4RunScope, pages: string[], port: M4PagePort = studioPagePort): Promise<void> {
  if (!scope.force) return;
  const devices = m4ScopeDevices(scope);
  // With --device the shared is not in scope: a new shared would regenerate both devices.
  if (!scope.device) for (const pageId of pages) await port.writeJson(sharedReceiptInfo(identity, pageId), invalid('force'));
  for (const pageId of pages) for (const device of devices) {
    await port.writeJson(pageReceiptInfo(identity, pageId, device), invalid('force'));
    if (scope.review) await port.writeJson(reviewReceiptInfo(identity, pageId, device), invalid('force'));
  }
}

/** The review worker of a unit, when --review asks for one and its review is not reusable. */
async function reviewStep(identity: M4RunIdentity, pageId: string, device: L2Page11Device, scope: M4RunScope, snapshot: M4InputSnapshot | undefined, port: M4PagePort): Promise<mls.msg.AIAgentStep | null> {
  if (!scope.review || (await m4ReviewState(identity, pageId, device, port, snapshot)).reusable) return null;
  // A failed review of an earlier run must not settle this one.
  await port.writeJson(reviewReceiptInfo(identity, pageId, device), invalid('pending'));
  return reviewWorkerStep({ ...identity, pageId, device, scope, chain: true });
}

/** After a page's shared is approved (or reused): its page workers, or — when a page is done — its review. */
export async function m4ChainAfterShared(identity: M4RunIdentity, pageId: string, scope: M4RunScope, snapshot?: M4InputSnapshot, port: M4PagePort = studioPagePort): Promise<mls.msg.AIAgentStep[]> {
  const steps: mls.msg.AIAgentStep[] = [];
  for (const device of m4ScopeDevices(scope)) {
    if (!await reusableM4Page(identity, pageId, device, port, snapshot)) steps.push(pageWorkerStep({ ...identity, pageId, device, attempt: 1, scope, chain: true }));
    else {
      const review = await reviewStep(identity, pageId, device, scope, snapshot, port);
      if (review) steps.push(review);
    }
  }
  return steps;
}

/** After one page × device is approved: its review, if any. */
export async function m4ChainAfterPage(identity: M4RunIdentity, pageId: string, device: L2Page11Device, scope: M4RunScope, port: M4PagePort = studioPagePort): Promise<mls.msg.AIAgentStep[]> {
  const review = await reviewStep(identity, pageId, device, scope, undefined, port);
  return review ? [review] : [];
}

/**
 * The first pending units of every chain in scope (the shared40 dispatcher), grouped by page: each page with
 * pending work gets one group step (agentM4ChainPage) that hosts them (Guilherme, 09/10/2026: the run read as one
 * flat list of shareds, pages, repairs and reviews of every page mixed). `steps` is the same units, flat.
 */
export async function m4ChainStart(identity: M4RunIdentity, scope: M4RunScope, port: M4PagePort = studioPagePort): Promise<{ steps: mls.msg.AIAgentStep[]; pages: string[]; chains: Array<{ pageId: string; steps: mls.msg.AIAgentStep[] }> }> {
  const snapshot = await readM4Snapshot(identity, port);
  const pages = m4ScopePages(snapshot.accepted, scope);
  await m4ChainForce(identity, scope, pages, port);
  const chains: Array<{ pageId: string; steps: mls.msg.AIAgentStep[] }> = [];
  for (const pageId of pages) {
    const steps = !await reusableM4Shared(identity, pageId, port, snapshot)
      ? [sharedWorkerStep({ ...identity, pageId, attempt: 1, scope })]
      : await m4ChainAfterShared(identity, pageId, scope, snapshot, port);
    if (steps.length) chains.push({ pageId, steps });
  }
  return { steps: chains.flatMap(chain => chain.steps), pages, chains };
}

/** Whether every chain in scope is settled: shared and pages reusable; reviews settled (done or failed). */
export async function m4ChainSettled(identity: M4RunIdentity, scope: M4RunScope = {}, port: M4PagePort = studioPagePort): Promise<{ settled: boolean; pages: string[]; snapshotHash: string }> {
  const snapshot = await readM4Snapshot(identity, port);
  const pages = m4ScopePages(snapshot.accepted, scope);
  const result = (settled: boolean) => ({ settled, pages, snapshotHash: snapshot.snapshotHash });
  for (const pageId of pages) {
    if (!await reusableM4Shared(identity, pageId, port, snapshot)) return result(false);
    for (const device of m4ScopeDevices(scope)) {
      if (!await reusableM4Page(identity, pageId, device, port, snapshot)) return result(false);
      if (scope.review && !(await m4ReviewState(identity, pageId, device, port, snapshot)).settled) return result(false);
    }
  }
  return result(true);
}

/** `shared40-done` once every chain in scope is settled; null otherwise. */
export async function m4ChainDoneIntent(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, identity: M4RunIdentity, scope: M4RunScope = {}): Promise<mls.msg.AgentIntent | null> {
  const state = await m4ChainSettled(identity, scope);
  if (!state.settled) return null;
  await markM4Step(identity, 'shared40', { status: 'approved', artifactPaths: state.pages.map(pageId => displayPath(sharedReceiptInfo(identity, pageId))), snapshotHash: state.snapshotHash });
  return addAgentStep(context, parentStep.stepId, agentResult('Shared and pages ready', JSON.stringify({ ...identity, completedStep: 'shared40', pages: state.pages, devices: m4ScopeDevices(scope), review: Boolean(scope.review), scope: m4ScopeLabel(scope) }), 'shared40-done'));
}
