/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/chain.ts" enhancement="_blank"/>

// The per-page chain (Guilherme, 05/10/2026: a page must not wait for every other shared, nor a review for
// every other page). shared40 starts one chain per page in scope:
//   shared approved → that page's desktop/mobile workers → each approved page → its review (with --review).
// An added step that is not waiting_dependency runs at once (skills/collab_messages.md), so each page moves
// on as soon as its own previous unit is approved. `shared40-done` is emitted only when every chain in scope
// is settled; pages50 and review55 stay in the plan as sweepers: they usually find everything done, and only
// dispatch what a chain left behind (a resumed run). `--force` deletes the generated files in scope here, once.
// Without `--force`, a file already on disk is checked against the current contract: it compiles and is kept,
// or it comes back as one repair that starts from that file. A missing file is still generated.

import { displayPath } from '/_102035_/l2/solution/fs.js';
import { m4ScopeDevices, m4ScopeLabel, m4ScopePages, markM4Step, type M4RunIdentity, type M4RunScope } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { addAgentStep, agentResult } from '/_102020_/l2/agentMaterializeL2/helpers/intents.js';
import { L2_PRIMARY_GENOME, type L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import type { M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { deleteGeneratedFile, m4CheckExistingShared, m4SharedCurrent, readM4Snapshot, reusableM4Shared, sharedDeclarationInfo, sharedReceiptInfo, sharedSourceInfo } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { sharedWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import { m4CheckExistingPage, m4PageCurrent, pageSourceInfo, reusableM4Page, studioPagePort, type M4PagePort } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';
import { m4PageSlots, pageWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import { dropFailedM4Review, m4ReviewState } from '/_102020_/l2/agentMaterializeL2/steps/review55/run.js';
import { reviewWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';

/** --force, once, at the start of the chains: the generated files in scope are deleted, then existence decides. */
export async function m4ChainForce(identity: M4RunIdentity, scope: M4RunScope, pages: string[], port: M4PagePort = studioPagePort): Promise<void> {
  if (!scope.force) return;
  const devices = m4ScopeDevices(scope);
  const remove = port.deleteText ?? deleteGeneratedFile;
  // With --device the shared is not in scope: a new shared would regenerate both devices.
  if (!scope.device) {
    for (const pageId of pages) {
      await remove(sharedSourceInfo(identity, pageId));
      await remove(sharedDeclarationInfo(identity, pageId));
    }
  }
  const snapshot = await readM4Snapshot(identity, port);
  for (const slot of m4PageSlots(snapshot, pages, devices, scope)) {
    await remove(pageSourceInfo(identity, slot.pageId, slot.device, slot.genome));
  }
}

/** What this dispatch did with one unit. `generated` is a missing file; the other three come from the disk check. */
export type M4ChainVerdict = 'kept' | 'repaired' | 'generated' | 'reused';

export interface M4ChainDeviceVerdict { device: L2Page11Device; genome: string; verdict: M4ChainVerdict }

/** One page, one line: `produtos: shared kept; desktop generated; mobile reused`. */
export function m4ChainStatusLine(pageId: string, shared: M4ChainVerdict, devices: M4ChainDeviceVerdict[]): string {
  const pages = devices.map(item => `${item.device}${item.genome === L2_PRIMARY_GENOME ? '' : ` ${item.genome}`} ${item.verdict}`).join('; ');
  return `${pageId}: shared ${shared}${pages ? `; ${pages}` : ''}`;
}

/** The review worker of a unit, when --review asks for one and its review is not reusable. */
async function reviewStep(identity: M4RunIdentity, pageId: string, device: L2Page11Device, scope: M4RunScope, snapshot: M4InputSnapshot | undefined, port: M4PagePort): Promise<mls.msg.AIAgentStep | null> {
  if (!scope.review || (await m4ReviewState(identity, pageId, device, port, snapshot)).reusable) return null;
  await dropFailedM4Review(identity, pageId, device, port);
  return reviewWorkerStep({ ...identity, pageId, device, scope, chain: true });
}

/** Page units of one page after its shared is settled: missing files are generated; a file on disk is checked. */
async function m4ChainPages(identity: M4RunIdentity, pageId: string, scope: M4RunScope, snapshot: M4InputSnapshot | undefined, port: M4PagePort): Promise<{ steps: mls.msg.AIAgentStep[]; devices: M4ChainDeviceVerdict[] }> {
  const steps: mls.msg.AIAgentStep[] = [];
  const devices: M4ChainDeviceVerdict[] = [];
  const snap = snapshot ?? await readM4Snapshot(identity, port);
  for (const slot of m4PageSlots(snap, [pageId], m4ScopeDevices(scope), scope)) {
    const variant = slot.genome === L2_PRIMARY_GENOME ? {} : { genome: slot.genome };
    const base = { ...identity, pageId, device: slot.device, ...variant, scope, chain: true as const };
    if (!await reusableM4Page(identity, pageId, slot.device, port, snap, slot.genome)) {
      devices.push({ device: slot.device, genome: slot.genome, verdict: 'generated' });
      steps.push(pageWorkerStep({ ...base, attempt: 1 }));
      continue;
    }
    const check = await m4CheckExistingPage(identity, pageId, slot.device, slot.genome, port, snap);
    if (check.verdict === 'repair') {
      devices.push({ device: slot.device, genome: slot.genome, verdict: 'repaired' });
      steps.push(pageWorkerStep({ ...base, attempt: 2, diagnostic: check.diagnostic, previous: check.previous, design: check.design }));
      continue;
    }
    devices.push({ device: slot.device, genome: slot.genome, verdict: check.verdict });
    if (slot.genome === L2_PRIMARY_GENOME) {
      // review55 reads the primary page11 only.
      const review = await reviewStep(identity, pageId, slot.device, scope, snap, port);
      if (review) steps.push(review);
    }
  }
  return { steps, devices };
}

/** After a page's shared is approved (or reused): its page workers, or — when a page is done — its review. */
export async function m4ChainAfterShared(identity: M4RunIdentity, pageId: string, scope: M4RunScope, snapshot?: M4InputSnapshot, port: M4PagePort = studioPagePort): Promise<mls.msg.AIAgentStep[]> {
  return (await m4ChainPages(identity, pageId, scope, snapshot, port)).steps;
}

/** After one page × device is approved: its review, if any (only for page11: review55 reads the primary page11). */
export async function m4ChainAfterPage(identity: M4RunIdentity, pageId: string, device: L2Page11Device, scope: M4RunScope, port: M4PagePort = studioPagePort, genome: string = L2_PRIMARY_GENOME): Promise<mls.msg.AIAgentStep[]> {
  if (genome !== L2_PRIMARY_GENOME) return [];
  const review = await reviewStep(identity, pageId, device, scope, undefined, port);
  return review ? [review] : [];
}

/**
 * The first pending units of every chain in scope (the shared40 dispatcher), grouped by page: each page with
 * pending work gets one group step (agentM4ChainPage) that hosts them (Guilherme, 09/10/2026: the run read as one
 * flat list of shareds, pages, repairs and reviews of every page mixed). `steps` is the same units, flat.
 */
export async function m4ChainStart(identity: M4RunIdentity, scope: M4RunScope, port: M4PagePort = studioPagePort): Promise<{ steps: mls.msg.AIAgentStep[]; pages: string[]; lines: string[]; chains: Array<{ pageId: string; steps: mls.msg.AIAgentStep[]; line: string }> }> {
  const snapshot = await readM4Snapshot(identity, port);
  const pages = m4ScopePages(snapshot.accepted, scope);
  await m4ChainForce(identity, scope, pages, port);
  const reports: Array<{ pageId: string; steps: mls.msg.AIAgentStep[]; line: string }> = [];
  for (const pageId of pages) {
    let shared: M4ChainVerdict;
    let steps: mls.msg.AIAgentStep[];
    let devices: M4ChainDeviceVerdict[] = [];
    if (!await reusableM4Shared(identity, pageId, port, snapshot)) {
      shared = 'generated';
      steps = [sharedWorkerStep({ ...identity, pageId, attempt: 1, scope })];
    } else {
      const check = await m4CheckExistingShared(identity, pageId, port, snapshot);
      if (check.verdict === 'repair') {
        shared = 'repaired';
        steps = [sharedWorkerStep({ ...identity, pageId, attempt: 2, diagnostic: check.diagnostic, previous: check.previous, scope })];
      } else {
        shared = check.verdict;
        const pagesOfChain = await m4ChainPages(identity, pageId, scope, snapshot, port);
        steps = pagesOfChain.steps;
        devices = pagesOfChain.devices;
      }
    }
    const line = m4ChainStatusLine(pageId, shared, devices);
    reports.push({ pageId, steps, line });
  }
  const chains = reports.filter(chain => chain.steps.length);
  return { steps: chains.flatMap(chain => chain.steps), pages, lines: reports.map(chain => chain.line), chains };
}

/** Whether every chain in scope is settled: shared and pages reusable; reviews settled (done or failed). */
export async function m4ChainSettled(identity: M4RunIdentity, scope: M4RunScope = {}, port: M4PagePort = studioPagePort): Promise<{ settled: boolean; pages: string[]; snapshotHash: string }> {
  const snapshot = await readM4Snapshot(identity, port);
  const pages = m4ScopePages(snapshot.accepted, scope);
  const result = (settled: boolean) => ({ settled, pages, snapshotHash: snapshot.snapshotHash });
  for (const pageId of pages) {
    // Existence is not enough: a receipt that is not current still has a repair (or a keep) pending.
    if (!await reusableM4Shared(identity, pageId, port, snapshot) || !await m4SharedCurrent(identity, pageId, port, snapshot)) return result(false);
    for (const slot of m4PageSlots(snapshot, [pageId], m4ScopeDevices(scope), scope)) {
      if (!await reusableM4Page(identity, pageId, slot.device, port, snapshot, slot.genome) || !await m4PageCurrent(identity, pageId, slot.device, slot.genome, port, snapshot)) return result(false);
      if (scope.review && slot.genome === L2_PRIMARY_GENOME && !(await m4ReviewState(identity, pageId, slot.device, port, snapshot)).settled) return result(false);
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
