/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.ts" enhancement="_blank"/>

import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { readD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { readD2SharedManifest, readD2SharedSource } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import type { D2MoleculeCatalogPort, D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { resolveD2MoleculeSelection } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { D2_PAGES_VERSION, type D2PageDevice, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { gateD2Pages } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { assertD2RenderedPage, renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { d2PageDisplayPath, readD2PageSource, readD2PagesResult, writeD2PageSource, writeD2PagesManifest, writeD2PagesResult } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';

export interface D2PagesUnitResult extends D2RunIdentity { schemaVersion: typeof D2_PAGES_VERSION; pageId: string; status: 'approved'; snapshotHash: string; sharedHash: string; sourceHashes: Record<D2PageDevice, string>; artifactPaths: Record<D2PageDevice, string>; pipelineItemIds: Record<D2PageDevice, string>; attempts: number; }
export interface D2PagesManifest extends D2RunIdentity { schemaVersion: typeof D2_PAGES_VERSION; status: 'approved'; snapshotHash: string; units: D2PagesUnitResult[]; }

export async function getD2PagesContext(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string): Promise<{ page: D2InputSnapshot['selection']['pages'][number]; shared: D2SharedDefinition }> {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId && snapshot.selection.writePageIds.includes(item.pageId));
  if (!page) throw new Error(`D2_PAGES_PAGE_NOT_SELECTED: ${pageId}`);
  const source = await readD2SharedSource(identity, pageId);
  const match = /export const definition = ([\s\S]*?) as const;/.exec(source);
  if (!match) throw new Error(`D2_PAGES_SHARED_INVALID: ${pageId}`);
  let shared: D2SharedDefinition;
  try { shared = JSON.parse(match[1]) as D2SharedDefinition; } catch { throw new Error(`D2_PAGES_SHARED_INVALID: ${pageId}`); }
  return { page, shared };
}

export async function approveD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, judgment: D2PagesJudgment, inventory: D2MoleculeInventory, port: D2MoleculeCatalogPort, attempt: number, verifySources: () => Promise<void> = async () => undefined): Promise<D2PagesUnitResult> {
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const { page, shared } = await getD2PagesContext(identity, snapshot, pageId);
  const requested = [...new Set(judgment.presentations.flatMap(item => item.groupIds))];
  const molecules = await resolveD2MoleculeSelection(port, inventory, requested);
  const groupSkills = new Map(molecules.groups.map(group => [group.groupId, [group.indexPipelineReference, group.usageContractPipelineReference]]));
  const rendered = gateD2Pages(identity.module, page, shared, judgment, groupSkills);
  const sources = Object.fromEntries(rendered.map(item => { const source = renderD2Page(item); assertD2RenderedPage(source); return [item.device, source]; })) as Record<D2PageDevice, string>;
  return persistD2PagesUnit(identity, snapshot, pageId, sources, rendered.map(item => item.pipeline[0].id) as [string, string], attempt, dependency.sourceHash, verifySources);
}

export async function persistD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, sources: Record<D2PageDevice, string>, itemIds: [string, string], attempt: number, expectedSharedHash?: string, verifySources: () => Promise<void> = async () => undefined): Promise<D2PagesUnitResult> {
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  if (expectedSharedHash && dependency.sourceHash !== expectedSharedHash) throw new Error(`D2_PAGES_SHARED_CHANGED: ${pageId}`);
  const prior = await readD2PagesResult(identity, pageId);
  if (prior?.status === 'approved' && prior.snapshotHash === snapshot.snapshotHash) {
    for (const device of ['desktop', 'mobile'] as const) {
      if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== prior.sourceHashes[device]) throw new Error(`D2_PAGES_APPROVED_SOURCE_CHANGED: ${pageId}/${device}`);
    }
    return prior;
  }
  const sourceHashes = { desktop: await sha256Text(sources.desktop), mobile: await sha256Text(sources.mobile) };
  for (const device of ['desktop', 'mobile'] as const) {
    await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) await writeD2PageSource(identity, pageId, device, sources[device]);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) throw new Error(`D2_PAGES_WRITE_HASH_MISMATCH: ${pageId}/${device}`);
  }
  await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const result: D2PagesUnitResult = { schemaVersion: D2_PAGES_VERSION, ...identity, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, sharedHash: dependency.sourceHash, sourceHashes, artifactPaths: { desktop: d2PageDisplayPath(identity, pageId, 'desktop'), mobile: d2PageDisplayPath(identity, pageId, 'mobile') }, pipelineItemIds: { desktop: itemIds[0], mobile: itemIds[1] }, attempts: attempt };
  await writeD2PagesResult(identity, result); return result;
}

export async function finalizeD2PagesBarrier(identity: D2RunIdentity, snapshot: D2InputSnapshot, verifySources: () => Promise<void> = async () => undefined): Promise<D2PagesManifest | null> {
  const units: D2PagesUnitResult[] = [];
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources();
  for (const pageId of [...snapshot.selection.writePageIds].sort()) {
    const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    const unit = await readD2PagesResult(identity, pageId);
    if (!unit || unit.status !== 'approved' || unit.snapshotHash !== snapshot.snapshotHash || unit.sharedHash !== dependency.sourceHash) return null;
    for (const device of ['desktop', 'mobile'] as const) if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== unit.sourceHashes[device]) return null;
    units.push(unit);
  }
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources(); await assertSnapshot(identity, snapshot.snapshotHash);
  for (const unit of units) {
    const dependency = await assertD2PagesDependencies(identity, snapshot, unit.pageId, verifySources);
    if (dependency.sourceHash !== unit.sharedHash) return null;
    for (const device of ['desktop', 'mobile'] as const) if (await sha256Text(await readD2PageSource(identity, unit.pageId, device)) !== unit.sourceHashes[device]) return null;
  }
  const manifest: D2PagesManifest = { schemaVersion: D2_PAGES_VERSION, ...identity, status: 'approved', snapshotHash: snapshot.snapshotHash, units };
  await writeD2PagesManifest(identity, manifest); return manifest;
}

export async function assertD2PagesDependencies(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, verifySources: () => Promise<void> = async () => undefined) {
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources(); await assertSnapshot(identity, snapshot.snapshotHash);
  const manifest = await readD2SharedManifest(identity); const unit = manifest?.units.find(item => item.pageId === pageId);
  if (!manifest || manifest.status !== 'approved' || manifest.snapshotHash !== snapshot.snapshotHash || !unit) throw new Error(`D2_PAGES_SHARED_BARRIER_MISSING: ${pageId}`);
  const sourceHash = await sha256Text(await readD2SharedSource(identity, pageId));
  if (sourceHash !== unit.sourceHash) throw new Error(`D2_PAGES_SHARED_HASH_MISMATCH: ${pageId}`);
  return { unit, sourceHash };
}
async function assertSnapshot(identity: D2RunIdentity, hash: string): Promise<void> { if ((await readD2Input(identity))?.snapshotHash !== hash) throw new Error('D2_PAGES_STALE_RUN'); }
