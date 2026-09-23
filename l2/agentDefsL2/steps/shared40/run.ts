/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/run.ts" enhancement="_blank"/>
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { buildD2ContractsCatalog } from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { d2ContractsSources, sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { readApprovedD2ContractsManifest, readD2ContractSource } from '/_102020_/l2/agentDefsL2/steps/contracts30/io.js';
import type { D2InputArtifacts, D2InputSnapshot, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { readD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { D2_SHARED_VERSION, buildD2SharedPipeline, type D2SharedJudgment } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { readD2SharedMaterializationContext } from '/_102020_/l2/agentDefsL2/steps/shared40/context.js';
import { d2SharedContextPort } from '/_102020_/l2/agentDefsL2/steps/shared40/contextCatalog.js';
import { assertD2RenderedShared, gateD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/gate.js';
import { renderD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { d2SharedDisplayPath, readD2SharedResult, readD2SharedSource, writeD2SharedManifest, writeD2SharedResult, writeD2SharedSource } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';

export interface D2SharedUnitResult extends D2RunIdentity { schemaVersion: typeof D2_SHARED_VERSION; pageId: string; status: 'approved'; snapshotHash: string; contractHash: string; contextHash: string; skillHash: string; sourceHash: string; artifactPath: string; pipelineItemId: string; attempts: number; }
export interface D2SharedManifest extends D2RunIdentity { schemaVersion: typeof D2_SHARED_VERSION; status: 'approved'; snapshotHash: string; units: D2SharedUnitResult[]; }

export function getD2SharedContext(identity: D2RunIdentity, snapshot: D2InputSnapshot, artifacts: D2InputArtifacts, pageId: string): { page: D2SelectedPage; contract: ReturnType<typeof buildD2ContractsCatalog>[number] } {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId && snapshot.selection.writePageIds.includes(item.pageId));
  if (!page) throw new Error(`D2_SHARED_PAGE_NOT_SELECTED: ${pageId}`);
  const contract = buildD2ContractsCatalog(d2ContractsSources(snapshot, artifacts)).find(item => item.pageId === pageId);
  if (!contract) throw new Error(`D2_SHARED_CONTRACT_CONTEXT_MISSING: ${pageId}`);
  return { page, contract };
}

export async function approveD2SharedUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, artifacts: D2InputArtifacts, pageId: string, judgment: D2SharedJudgment, attempt: number, verifySources: () => Promise<void> = async () => undefined): Promise<D2SharedUnitResult> {
  await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
  const { page, contract } = getD2SharedContext(identity, snapshot, artifacts, pageId);
  const definition = gateD2Shared(identity.module, page, contract, judgment);
  const pipeline = buildD2SharedPipeline(identity.module, pageId);
  const source = renderD2Shared(definition, pipeline);
  assertD2RenderedShared(source);
  const context = await readD2SharedMaterializationContext(pipeline, d2SharedContextPort);
  return persistD2SharedUnit(identity, snapshot, pageId, source, attempt, { contextHash: context.contextHash, skillHash: context.skillHash }, verifySources);
}

export interface D2SharedContextReceipt { contextHash: string; skillHash: string; }

export async function persistD2SharedUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, source: string, attempt: number, receipt: D2SharedContextReceipt, verifySources: () => Promise<void> = async () => undefined): Promise<D2SharedUnitResult> {
  const contractUnit = await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
  const prior = await readD2SharedResult(identity, pageId);
  if (prior?.schemaVersion === D2_SHARED_VERSION && prior.status === 'approved' && prior.snapshotHash === snapshot.snapshotHash && prior.contextHash === receipt.contextHash && prior.skillHash === receipt.skillHash) {
    if (await sha256Text(await readD2SharedSource(identity, pageId)) !== prior.sourceHash) throw new Error(`D2_SHARED_APPROVED_SOURCE_CHANGED: ${pageId}`);
    return prior;
  }
  const sourceHash = await sha256Text(source);
  await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
  if (await sha256Text(await readD2SharedSource(identity, pageId)) !== sourceHash) await writeD2SharedSource(identity, pageId, source);
  if (await sha256Text(await readD2SharedSource(identity, pageId)) !== sourceHash) throw new Error(`D2_SHARED_WRITE_HASH_MISMATCH: ${pageId}`);
  await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
  const result: D2SharedUnitResult = { schemaVersion: D2_SHARED_VERSION, ...identity, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, contractHash: contractUnit.sourceHash, ...receipt, sourceHash, artifactPath: d2SharedDisplayPath(identity, pageId), pipelineItemId: buildD2SharedPipeline(identity.module, pageId).id, attempts: attempt };
  await writeD2SharedResult(identity, result);
  return result;
}

export async function finalizeD2SharedBarrier(identity: D2RunIdentity, snapshot: D2InputSnapshot, verifySources: () => Promise<void> = async () => undefined): Promise<D2SharedManifest | null> {
  const pageIds = [...snapshot.selection.writePageIds].sort();
  await assertSnapshot(identity, snapshot.snapshotHash);
  await verifySources();
  await assertSnapshot(identity, snapshot.snapshotHash);
  const units: D2SharedUnitResult[] = [];
  for (const pageId of pageIds) {
    const contractUnit = await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
    const unit = await readD2SharedResult(identity, pageId);
    const pipeline = buildD2SharedPipeline(identity.module, pageId);
    const context = await readD2SharedMaterializationContext(pipeline, d2SharedContextPort);
    if (!unit || unit.schemaVersion !== D2_SHARED_VERSION || unit.snapshotHash !== snapshot.snapshotHash || unit.status !== 'approved' || unit.contextHash !== context.contextHash || unit.skillHash !== context.skillHash) return null;
    if (unit.contractHash !== contractUnit.sourceHash) return null;
    if (await sha256Text(await readD2SharedSource(identity, pageId)) !== unit.sourceHash) return null;
    units.push(unit);
  }
  await assertSnapshot(identity, snapshot.snapshotHash);
  await verifySources();
  for (const pageId of pageIds) await assertD2SharedDependencies(identity, snapshot, pageId, verifySources);
  const manifest: D2SharedManifest = { schemaVersion: D2_SHARED_VERSION, ...identity, status: 'approved', snapshotHash: snapshot.snapshotHash, units };
  await writeD2SharedManifest(identity, manifest);
  return manifest;
}
async function assertSnapshot(identity: D2RunIdentity, hash: string): Promise<void> { if ((await readD2Input(identity))?.snapshotHash !== hash) throw new Error('D2_SHARED_STALE_RUN'); }

export async function assertD2SharedDependencies(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, verifySources: () => Promise<void> = async () => undefined) {
  await assertSnapshot(identity, snapshot.snapshotHash);
  await verifySources();
  await assertSnapshot(identity, snapshot.snapshotHash);
  const manifest = await readApprovedD2ContractsManifest(identity, snapshot.snapshotHash);
  const unit = manifest?.units.find(item => item.pageId === pageId);
  if (!unit) throw new Error(`D2_SHARED_CONTRACT_BARRIER_MISSING: ${pageId}`);
  const liveHash = await sha256Text(await readD2ContractSource(identity, pageId));
  if (liveHash !== unit.sourceHash) throw new Error(`D2_SHARED_CONTRACT_HASH_MISMATCH: ${pageId}`);
  return unit;
}
